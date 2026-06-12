import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { StockTransfersRepository } from './stock-transfers.repository';
import { OutletsRepository } from '../outlets/outlets.repository';
import { CreateTransferDTO, TransferItemDTO } from './dto/create-transfer.dto';
import { UpdateTransferDTO } from './dto/update-transfer.dto';
import { TransferQueryDTO } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/response-transfer.dto';
import { SelectStockTransfer } from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildStringCursorPage,
  decodeStringCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  TransferInvalidStatusException,
  TransferItemInvalidException,
  TransferNotFoundException,
  TransferSameOutletException,
  TransferStockInsufficientException,
} from '../../common/exceptions/domains/stock-transfer.exceptions';
import {
  OutletInactiveException,
  OutletNotFoundException,
} from '../../common/exceptions/domains/outlet.exceptions';

@Injectable()
export class StockTransfersService {
  constructor(
    private readonly transfersRepository: StockTransfersRepository,
    private readonly outletsRepository: OutletsRepository
  ) {}

  async create(
    dto: CreateTransferDTO,
    createdBy: string
  ): Promise<TransferResponseDto> {
    if (dto.fromOutletId === dto.toOutletId) {
      throw TransferSameOutletException({
        details: { outletId: dto.fromOutletId },
      });
    }
    await this.assertOutletActive(dto.fromOutletId);
    await this.assertOutletActive(dto.toOutletId);
    await this.assertItems(dto.items);

    const transfer = await this.transfersRepository.createWithItems(
      {
        transferNumber: this.generateNumber(),
        fromOutletId: dto.fromOutletId,
        toOutletId: dto.toOutletId,
        createdBy,
        notes: dto.notes ?? null,
      },
      dto.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }))
    );
    return this.toResponse(transfer);
  }

  async findById(id: string): Promise<TransferResponseDto> {
    return this.toResponse(await this.getTransferOrThrow(id));
  }

  async list(
    query: TransferQueryDTO
  ): Promise<WithMetadata<TransferResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.transfersRepository.list(
      { status: query.status, outletId: query.outletId },
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    const data = await Promise.all(
      items.map((transfer) => this.toResponse(transfer))
    );
    return { data, metadata: meta };
  }

  /** Update notes/items — hanya DRAFT; items mengganti seluruh daftar. */
  async update(
    id: string,
    dto: UpdateTransferDTO
  ): Promise<TransferResponseDto> {
    const transfer = await this.getTransferOrThrow(id);
    this.assertStatus(transfer, ['DRAFT']);

    if (dto.items !== undefined) {
      await this.assertItems(dto.items);
      await this.transfersRepository.replaceItems(
        id,
        dto.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        }))
      );
    }
    if (dto.notes !== undefined) {
      await this.transfersRepository.update(id, { notes: dto.notes });
    }
    return this.toResponse(await this.getTransferOrThrow(id));
  }

  /**
   * Kirim: DRAFT → SENT. Stok keluar dari outlet asal secara atomic
   * (hanya bila available cukup) + ledger TRANSFER_OUT per item; gagal satu
   * item → seluruh transaksi rollback. Selama SENT barang "in transit".
   */
  async send(id: string, actorId: string): Promise<TransferResponseDto> {
    const transfer = await this.getTransferOrThrow(id);
    this.assertStatus(transfer, ['DRAFT']);
    const items = await this.transfersRepository.listItems(id);

    const updated = await this.transfersRepository.withTransaction(
      async (tx) => {
        const row = await this.transfersRepository.updateStatusIfTx(
          tx,
          id,
          'DRAFT',
          { status: 'SENT', sentAt: new Date() }
        );
        if (!row) return null;

        for (const item of items) {
          const deducted = await this.outletsRepository.deductStock(
            tx,
            transfer.fromOutletId,
            item.variantId,
            item.quantity,
            { refType: 'stock_transfer', refId: id, actorId }
          );
          if (!deducted) {
            throw TransferStockInsufficientException({
              details: {
                outletId: transfer.fromOutletId,
                variantId: item.variantId,
                requested: item.quantity,
              },
            });
          }
        }
        return row;
      }
    );

    if (!updated) {
      throw TransferInvalidStatusException({ details: { id, action: 'send' } });
    }
    return this.toResponse(updated);
  }

  /** Terima: SENT → RECEIVED. Stok masuk ke outlet tujuan + ledger TRANSFER_IN. */
  async receive(id: string, actorId: string): Promise<TransferResponseDto> {
    const transfer = await this.getTransferOrThrow(id);
    this.assertStatus(transfer, ['SENT']);
    const items = await this.transfersRepository.listItems(id);

    const updated = await this.transfersRepository.withTransaction(
      async (tx) => {
        const row = await this.transfersRepository.updateStatusIfTx(
          tx,
          id,
          'SENT',
          { status: 'RECEIVED', receivedAt: new Date() }
        );
        if (!row) return null;

        for (const item of items) {
          await this.outletsRepository.addStock(
            tx,
            transfer.toOutletId,
            item.variantId,
            item.quantity,
            'TRANSFER_IN',
            { refType: 'stock_transfer', refId: id, actorId }
          );
        }
        return row;
      }
    );

    if (!updated) {
      throw TransferInvalidStatusException({
        details: { id, action: 'receive' },
      });
    }
    return this.toResponse(updated);
  }

  /** Batalkan — hanya DRAFT (belum ada stok yang bergerak). */
  async cancel(id: string): Promise<TransferResponseDto> {
    const transfer = await this.getTransferOrThrow(id);
    this.assertStatus(transfer, ['DRAFT']);

    const updated = await this.transfersRepository.withTransaction((tx) =>
      this.transfersRepository.updateStatusIfTx(tx, id, 'DRAFT', {
        status: 'CANCELLED',
      })
    );
    if (!updated) {
      throw TransferInvalidStatusException({
        details: { id, action: 'cancel' },
      });
    }
    return this.toResponse(updated);
  }

  // ---------- helpers ----------

  private async getTransferOrThrow(id: string): Promise<SelectStockTransfer> {
    const transfer = await this.transfersRepository.findById(id);
    if (!transfer) {
      throw TransferNotFoundException({ details: { id } });
    }
    return transfer;
  }

  private assertStatus(
    transfer: SelectStockTransfer,
    allowed: SelectStockTransfer['status'][]
  ): void {
    if (!allowed.includes(transfer.status)) {
      throw TransferInvalidStatusException({
        details: { id: transfer.id, status: transfer.status, allowed },
      });
    }
  }

  private async assertOutletActive(outletId: number): Promise<void> {
    const outlet = await this.outletsRepository.findById(outletId);
    if (!outlet) {
      throw OutletNotFoundException({ details: { id: outletId } });
    }
    if (!outlet.isActive) {
      throw OutletInactiveException({ details: { outletId } });
    }
  }

  private async assertItems(items: TransferItemDTO[]): Promise<void> {
    const variantIds = items.map((item) => item.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      throw TransferItemInvalidException({
        details: { reason: 'variant duplikat dalam daftar item' },
      });
    }
    for (const item of items) {
      if (!(await this.outletsRepository.variantExists(item.variantId))) {
        throw TransferItemInvalidException({
          details: { variantId: item.variantId, reason: 'tidak ditemukan' },
        });
      }
    }
  }

  private async toResponse(
    transfer: SelectStockTransfer
  ): Promise<TransferResponseDto> {
    const [items, fromOutlet, toOutlet] = await Promise.all([
      this.transfersRepository.listItems(transfer.id),
      this.outletsRepository.findById(transfer.fromOutletId),
      this.outletsRepository.findById(transfer.toOutletId),
    ]);

    return new TransferResponseDto({
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      fromOutletId: transfer.fromOutletId,
      fromOutletName: fromOutlet?.name ?? null,
      toOutletId: transfer.toOutletId,
      toOutletName: toOutlet?.name ?? null,
      status: transfer.status,
      notes: transfer.notes,
      createdBy: transfer.createdBy,
      items,
      sentAt: transfer.sentAt,
      receivedAt: transfer.receivedAt,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    });
  }

  private generateNumber(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const unique = uuidv7().replace(/-/g, '').slice(-6).toUpperCase();
    return `TRF-${datePart}-${unique}`;
  }
}
