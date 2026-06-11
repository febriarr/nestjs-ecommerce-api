import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
  PoItemView,
  PurchaseOrdersRepository,
} from './purchase-orders.repository';
import { OutletsRepository } from '../outlets/outlets.repository';
import { SuppliersRepository } from '../suppliers/suppliers.repository';
import { CreatePurchaseOrderDTO } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDTO } from './dto/update-purchase-order.dto';
import { PoItemInputDTO } from './dto/po-item-input.dto';
import { UpdatePoItemDTO } from './dto/update-po-item.dto';
import { PurchaseOrderQueryDTO } from './dto/po-query.dto';
import { CreateReceiptDTO } from './dto/create-receipt.dto';
import { QuickReceiveDTO } from './dto/quick-receive.dto';
import { QuickReceiveResponseDto } from './dto/response-quick-receive.dto';
import {
  PoItemResponse,
  PurchaseOrderResponseDto,
} from './dto/response-purchase-order.dto';
import {
  ReceiptItemResponse,
  ReceiptResponseDto,
} from './dto/response-receipt.dto';
import { isOverReceipt, resolveReceiptStatus } from './po-status.util';
import {
  SelectGoodsReceipt,
  SelectPurchaseOrder,
} from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildStringCursorPage,
  decodeStringCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  PurchaseOrderEmptyException,
  PurchaseOrderInvalidStatusException,
  PurchaseOrderItemConflictException,
  PurchaseOrderItemNotFoundException,
  PurchaseOrderNotFoundException,
  PurchaseOrderReceiptInvalidException,
} from '../../common/exceptions/domains/purchase-order.exceptions';
import { SupplierNotFoundException } from '../../common/exceptions/domains/supplier.exceptions';
import {
  OutletInactiveException,
  OutletNotFoundException,
} from '../../common/exceptions/domains/outlet.exceptions';
import { VariantNotFoundException } from '../../common/exceptions/domains/product-variant.exceptions';
import { UserNotFoundException } from '../../common/exceptions/domains/user.exceptions';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly poRepository: PurchaseOrdersRepository,
    private readonly suppliersRepository: SuppliersRepository,
    private readonly outletsRepository: OutletsRepository
  ) {}

  // ---------- PO lifecycle ----------

  async create(dto: CreatePurchaseOrderDTO): Promise<PurchaseOrderResponseDto> {
    await this.assertSupplier(dto.supplierId);
    await this.assertOutletReceivable(dto.outletId);
    if (!(await this.poRepository.userExists(dto.createdBy))) {
      throw UserNotFoundException({ details: { userId: dto.createdBy } });
    }

    const items = dto.items ?? [];
    await this.assertItemInputs(items);

    const po = await this.poRepository.createWithItems(
      {
        poNumber: this.generateNumber('PO'),
        supplierId: dto.supplierId,
        outletId: dto.outletId,
        createdBy: dto.createdBy,
        notes: dto.notes ?? null,
        ...(dto.expectedAt ? { expectedAt: new Date(dto.expectedAt) } : {}),
      },
      items.map((item) => ({
        variantId: item.variantId,
        qtyOrdered: item.qtyOrdered,
        unitCost: item.unitCost,
      }))
    );
    return this.toPoResponse(po);
  }

  async findById(id: string): Promise<PurchaseOrderResponseDto> {
    return this.toPoResponse(await this.getPoOrThrow(id));
  }

  async list(
    query: PurchaseOrderQueryDTO
  ): Promise<WithMetadata<PurchaseOrderResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.poRepository.list(
      {
        status: query.status,
        supplierId: query.supplierId,
        outletId: query.outletId,
      },
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    const data = await Promise.all(items.map((po) => this.toPoResponse(po)));
    return { data, metadata: meta };
  }

  /** Update header — hanya DRAFT. */
  async update(
    id: string,
    dto: UpdatePurchaseOrderDTO
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT']);

    if (dto.supplierId !== undefined) await this.assertSupplier(dto.supplierId);
    if (dto.outletId !== undefined)
      await this.assertOutletReceivable(dto.outletId);

    const updated = await this.poRepository.update(id, {
      ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
      ...(dto.outletId !== undefined ? { outletId: dto.outletId } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.expectedAt !== undefined
        ? { expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null }
        : {}),
    });
    return this.toPoResponse(updated);
  }

  /** DRAFT → ORDERED: PO terkunci, siap dikirim ke supplier. */
  async submit(id: string): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT']);

    const items = await this.poRepository.listItems(id);
    if (items.length === 0) {
      throw PurchaseOrderEmptyException({ details: { id } });
    }

    const updated = await this.poRepository.updateStatusIf(id, 'DRAFT', {
      status: 'ORDERED',
    });
    if (!updated) {
      throw PurchaseOrderInvalidStatusException({
        details: { id, action: 'submit' },
      });
    }
    return this.toPoResponse(updated);
  }

  /** Batalkan — hanya selama belum ada penerimaan. */
  async cancel(id: string): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT', 'ORDERED']);
    if (await this.poRepository.hasReceipts(id)) {
      throw PurchaseOrderInvalidStatusException({
        details: { id, reason: 'sudah ada penerimaan' },
      });
    }

    const updated = await this.poRepository.updateStatusIf(id, po.status, {
      status: 'CANCELLED',
    });
    if (!updated) {
      throw PurchaseOrderInvalidStatusException({
        details: { id, action: 'cancel' },
      });
    }
    return this.toPoResponse(updated);
  }

  // ---------- items (hanya DRAFT) ----------

  async addItem(
    id: string,
    dto: PoItemInputDTO
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT']);

    if (!(await this.outletsRepository.variantExists(dto.variantId))) {
      throw VariantNotFoundException({ details: { variantId: dto.variantId } });
    }
    if (await this.poRepository.itemVariantExists(id, dto.variantId)) {
      throw PurchaseOrderItemConflictException({
        details: { variantId: dto.variantId },
      });
    }

    await this.poRepository.insertItem({
      poId: id,
      variantId: dto.variantId,
      qtyOrdered: dto.qtyOrdered,
      unitCost: dto.unitCost,
    });
    return this.toPoResponse(po);
  }

  async updateItem(
    id: string,
    itemId: number,
    dto: UpdatePoItemDTO
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT']);
    await this.getItemOrThrow(id, itemId);

    await this.poRepository.updateItem(itemId, {
      ...(dto.qtyOrdered !== undefined ? { qtyOrdered: dto.qtyOrdered } : {}),
      ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
    });
    return this.toPoResponse(po);
  }

  async removeItem(
    id: string,
    itemId: number
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['DRAFT']);
    await this.getItemOrThrow(id, itemId);

    await this.poRepository.deleteItem(itemId);
    return this.toPoResponse(po);
  }

  // ---------- penerimaan barang (GRN) ----------

  /**
   * Terima barang terhadap PO — parsial & berulang. Satu transaksi:
   * dokumen GRN + progres qtyReceived (FOR UPDATE, bebas race) + stok outlet
   * bertambah + ledger PURCHASE_RECEIPT + status PO ter-recompute.
   * Over-receipt diizinkan dan ditandai per item (flag overReceived).
   */
  async createReceipt(
    id: string,
    dto: CreateReceiptDTO
  ): Promise<ReceiptResponseDto> {
    const po = await this.getPoOrThrow(id);
    this.assertStatus(po, ['ORDERED', 'PARTIALLY_RECEIVED']);
    if (!(await this.poRepository.userExists(dto.receivedBy))) {
      throw UserNotFoundException({ details: { userId: dto.receivedBy } });
    }

    const poItemIds = dto.items.map((item) => item.poItemId);
    if (new Set(poItemIds).size !== poItemIds.length) {
      throw PurchaseOrderReceiptInvalidException({
        details: { reason: 'poItemId duplikat dalam satu penerimaan' },
      });
    }

    const { receipt, itemResponses } = await this.poRepository.withTransaction(
      async (tx) => {
        const lockedItems = await this.poRepository.lockItemsTx(tx, id);
        const itemById = new Map(lockedItems.map((item) => [item.id, item]));

        for (const input of dto.items) {
          if (!itemById.has(input.poItemId)) {
            throw PurchaseOrderItemNotFoundException({
              details: { poId: id, poItemId: input.poItemId },
            });
          }
        }

        const created = await this.poRepository.insertReceiptTx(tx, {
          receiptNumber: this.generateNumber('GRN'),
          poId: id,
          outletId: po.outletId,
          receivedBy: dto.receivedBy,
          notes: dto.notes ?? null,
        });

        const responses: ReceiptItemResponse[] = [];
        for (const input of dto.items) {
          const item = itemById.get(input.poItemId);
          if (!item) continue;

          const overReceived = isOverReceipt(
            item.qtyOrdered,
            item.qtyReceived,
            input.qtyReceived
          );

          await this.poRepository.insertReceiptItemTx(tx, {
            receiptId: created.id,
            poItemId: item.id,
            variantId: item.variantId,
            qtyReceived: input.qtyReceived,
            unitCost: item.unitCost,
            overReceived,
          });
          await this.poRepository.incrementItemReceivedTx(
            tx,
            item.id,
            input.qtyReceived
          );
          await this.outletsRepository.addStock(
            tx,
            po.outletId,
            item.variantId,
            input.qtyReceived,
            'PURCHASE_RECEIPT',
            {
              refType: 'goods_receipt',
              refId: created.id,
              actorId: dto.receivedBy,
            }
          );

          // Sinkronkan salinan lokal untuk perhitungan status di bawah.
          item.qtyReceived += input.qtyReceived;
          responses.push({
            poItemId: item.id,
            variantId: item.variantId,
            qtyReceived: input.qtyReceived,
            unitCost: item.unitCost,
            overReceived,
          });
        }

        await this.poRepository.updateStatusTx(
          tx,
          id,
          resolveReceiptStatus([...itemById.values()])
        );

        return { receipt: created, itemResponses: responses };
      }
    );

    return this.toReceiptResponse(receipt, itemResponses);
  }

  /**
   * "Barang Masuk" satu langkah (UMKM yang belanja tanpa memesan dulu):
   * PO (langsung RECEIVED) + GRN + stok outlet + ledger PURCHASE_RECEIPT
   * dibuat dalam SATU transaksi — tidak mungkin ada PO menggantung tanpa
   * penerimaan bila gagal di tengah. Klien yang butuh alur formal tetap
   * memakai create → submit → receipts.
   */
  async quickReceive(dto: QuickReceiveDTO): Promise<QuickReceiveResponseDto> {
    await this.assertSupplier(dto.supplierId);
    await this.assertOutletReceivable(dto.outletId);
    if (!(await this.poRepository.userExists(dto.receivedBy))) {
      throw UserNotFoundException({ details: { userId: dto.receivedBy } });
    }
    await this.assertItemInputs(
      dto.items.map((item) => ({
        variantId: item.variantId,
        qtyOrdered: item.quantity,
        unitCost: item.unitCost,
      }))
    );

    const { po, receipt, itemResponses } =
      await this.poRepository.withTransaction(async (tx) => {
        const createdPo = await this.poRepository.insertPoTx(tx, {
          poNumber: this.generateNumber('PO'),
          supplierId: dto.supplierId,
          outletId: dto.outletId,
          createdBy: dto.receivedBy,
          notes: dto.notes ?? null,
          status: 'RECEIVED',
        });

        const items = await this.poRepository.insertItemsTx(
          tx,
          dto.items.map((item) => ({
            poId: createdPo.id,
            variantId: item.variantId,
            qtyOrdered: item.quantity,
            qtyReceived: item.quantity,
            unitCost: item.unitCost,
          }))
        );

        const createdReceipt = await this.poRepository.insertReceiptTx(tx, {
          receiptNumber: this.generateNumber('GRN'),
          poId: createdPo.id,
          outletId: dto.outletId,
          receivedBy: dto.receivedBy,
          notes: dto.notes ?? null,
        });

        const responses: ReceiptItemResponse[] = [];
        for (const item of items) {
          await this.poRepository.insertReceiptItemTx(tx, {
            receiptId: createdReceipt.id,
            poItemId: item.id,
            variantId: item.variantId,
            qtyReceived: item.qtyOrdered,
            unitCost: item.unitCost,
            overReceived: false,
          });
          await this.outletsRepository.addStock(
            tx,
            dto.outletId,
            item.variantId,
            item.qtyOrdered,
            'PURCHASE_RECEIPT',
            {
              refType: 'goods_receipt',
              refId: createdReceipt.id,
              actorId: dto.receivedBy,
            }
          );
          responses.push({
            poItemId: item.id,
            variantId: item.variantId,
            qtyReceived: item.qtyOrdered,
            unitCost: item.unitCost,
            overReceived: false,
          });
        }

        return {
          po: createdPo,
          receipt: createdReceipt,
          itemResponses: responses,
        };
      });

    return new QuickReceiveResponseDto({
      purchaseOrder: await this.toPoResponse(po),
      receipt: this.toReceiptResponse(receipt, itemResponses),
    });
  }

  async listReceipts(id: string): Promise<ReceiptResponseDto[]> {
    await this.getPoOrThrow(id);
    const receipts = await this.poRepository.listReceipts(id);
    return Promise.all(
      receipts.map(async (receipt) => {
        const items = await this.poRepository.listReceiptItems(receipt.id);
        return this.toReceiptResponse(
          receipt,
          items.map((item) => ({
            poItemId: item.poItemId,
            variantId: item.variantId,
            qtyReceived: item.qtyReceived,
            unitCost: item.unitCost,
            overReceived: item.overReceived,
          }))
        );
      })
    );
  }

  // ---------- helpers ----------

  private async getPoOrThrow(id: string): Promise<SelectPurchaseOrder> {
    const po = await this.poRepository.findById(id);
    if (!po) {
      throw PurchaseOrderNotFoundException({ details: { id } });
    }
    return po;
  }

  private async getItemOrThrow(poId: string, itemId: number): Promise<void> {
    const item = await this.poRepository.findItem(poId, itemId);
    if (!item) {
      throw PurchaseOrderItemNotFoundException({
        details: { poId, poItemId: itemId },
      });
    }
  }

  private assertStatus(
    po: SelectPurchaseOrder,
    allowed: SelectPurchaseOrder['status'][]
  ): void {
    if (!allowed.includes(po.status)) {
      throw PurchaseOrderInvalidStatusException({
        details: { id: po.id, status: po.status, allowed },
      });
    }
  }

  private async assertSupplier(supplierId: number): Promise<void> {
    const supplier = await this.suppliersRepository.findById(supplierId);
    if (!supplier || !supplier.isActive) {
      throw SupplierNotFoundException({
        details: { id: supplierId, isActive: supplier?.isActive ?? null },
      });
    }
  }

  private async assertOutletReceivable(outletId: number): Promise<void> {
    const outlet = await this.outletsRepository.findById(outletId);
    if (!outlet) {
      throw OutletNotFoundException({ details: { id: outletId } });
    }
    if (!outlet.isActive) {
      throw OutletInactiveException({ details: { outletId } });
    }
  }

  private async assertItemInputs(items: PoItemInputDTO[]): Promise<void> {
    const variantIds = items.map((item) => item.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw PurchaseOrderItemConflictException({
        details: { reason: 'variant duplikat dalam daftar item' },
      });
    }
    for (const item of items) {
      if (!(await this.outletsRepository.variantExists(item.variantId))) {
        throw VariantNotFoundException({
          details: { variantId: item.variantId },
        });
      }
    }
  }

  private async toPoResponse(
    po: SelectPurchaseOrder
  ): Promise<PurchaseOrderResponseDto> {
    const [items, supplier, outlet] = await Promise.all([
      this.poRepository.listItems(po.id),
      this.suppliersRepository.findById(po.supplierId),
      this.outletsRepository.findById(po.outletId),
    ]);

    const itemResponses = items.map((item) => this.toItemResponse(item));
    return new PurchaseOrderResponseDto({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: supplier?.name ?? null,
      outletId: po.outletId,
      outletName: outlet?.name ?? null,
      status: po.status,
      expectedAt: po.expectedAt,
      notes: po.notes,
      createdBy: po.createdBy,
      items: itemResponses,
      subtotal: itemResponses.reduce((sum, item) => sum + item.lineTotal, 0),
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    });
  }

  private toItemResponse(item: PoItemView): PoItemResponse {
    return {
      id: item.id,
      variantId: item.variantId,
      skuCode: item.skuCode,
      variantName: item.variantName,
      productName: item.productName,
      qtyOrdered: item.qtyOrdered,
      unitCost: item.unitCost,
      lineTotal: item.qtyOrdered * item.unitCost,
      qtyReceived: item.qtyReceived,
      remaining: Math.max(0, item.qtyOrdered - item.qtyReceived),
    };
  }

  private toReceiptResponse(
    receipt: SelectGoodsReceipt,
    items: ReceiptItemResponse[]
  ): ReceiptResponseDto {
    return new ReceiptResponseDto({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      poId: receipt.poId,
      outletId: receipt.outletId,
      receivedBy: receipt.receivedBy,
      notes: receipt.notes,
      receivedAt: receipt.receivedAt,
      items,
    });
  }

  private generateNumber(prefix: 'PO' | 'GRN'): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const unique = uuidv7().replace(/-/g, '').slice(-6).toUpperCase();
    return `${prefix}-${datePart}-${unique}`;
  }
}
