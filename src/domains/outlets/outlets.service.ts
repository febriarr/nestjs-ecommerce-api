import { Injectable } from '@nestjs/common';
import { InventoryView, OutletsRepository } from './outlets.repository';
import { CreateOutletDTO } from './dto/create-outlet.dto';
import { UpdateOutletDTO } from './dto/update-outlet.dto';
import { OutletQueryDTO } from './dto/outlet-query.dto';
import { OutletResponseDto } from './dto/response-outlet.dto';
import { SetInventoryDTO } from './dto/set-inventory.dto';
import { InventoryResponseDto } from './dto/response-inventory.dto';
import {
  InsertOutlet,
  SelectOutlet,
} from '../../infrastructure/database/schema';
import { MovementResponseDto } from './dto/response-movement.dto';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildCursorPage,
  decodeCursor,
} from '../../common/pagination/cursor.util';
import {
  CursorQueryDTO,
  DEFAULT_PAGE_LIMIT,
} from '../../common/dto/cursor-query.dto';
import {
  OutletCodeConflictException,
  OutletInventoryInvalidException,
  OutletInventoryNotFoundException,
  OutletNotFoundException,
} from '../../common/exceptions/domains/outlet.exceptions';
import { VariantNotFoundException } from '../../common/exceptions/domains/product-variant.exceptions';

@Injectable()
export class OutletsService {
  constructor(private readonly outletsRepository: OutletsRepository) {}

  // ---------- outlets ----------

  async create(dto: CreateOutletDTO): Promise<OutletResponseDto> {
    if (await this.outletsRepository.findByCode(dto.code)) {
      throw OutletCodeConflictException({ details: { code: dto.code } });
    }
    const outlet = await this.outletsRepository.insert({
      ...this.toPayload(dto),
      name: dto.name,
      code: dto.code,
    });
    return this.toOutletResponse(outlet);
  }

  async findById(id: number): Promise<OutletResponseDto> {
    const outlet = await this.getOutletOrThrow(id);
    return this.toOutletResponse(outlet);
  }

  async list(
    query: OutletQueryDTO
  ): Promise<WithMetadata<OutletResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.outletsRepository.list(
      {
        isActive: query.isActive,
        servesOnline: query.servesOnline,
        search: query.search,
      },
      decodeCursor(query.cursor),
      limit
    );
    const { items, meta } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((outlet) => this.toOutletResponse(outlet)),
      metadata: meta,
    };
  }

  async update(id: number, dto: UpdateOutletDTO): Promise<OutletResponseDto> {
    const existing = await this.getOutletOrThrow(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      if (await this.outletsRepository.findByCode(dto.code)) {
        throw OutletCodeConflictException({ details: { code: dto.code } });
      }
    }

    const outlet = await this.outletsRepository.update(id, this.toPayload(dto));
    return this.toOutletResponse(outlet);
  }

  async softDelete(id: number): Promise<void> {
    await this.getOutletOrThrow(id);
    await this.outletsRepository.softDelete(id);
  }

  // ---------- inventory ----------

  /**
   * Set stok absolut (upsert). Stok baru tidak boleh lebih kecil dari
   * reservedStock yang sedang berjalan (CHECK constraint menjadi pagar
   * terakhir terhadap race).
   */
  async setInventory(
    outletId: number,
    variantId: number,
    dto: SetInventoryDTO,
    actorId: string
  ): Promise<InventoryResponseDto> {
    await this.getOutletOrThrow(outletId);
    if (!(await this.outletsRepository.variantExists(variantId))) {
      throw VariantNotFoundException({ details: { variantId } });
    }

    const existing = await this.outletsRepository.findInventoryRow(
      outletId,
      variantId
    );
    if (existing && dto.stock < existing.reservedStock) {
      throw OutletInventoryInvalidException({
        details: {
          stock: dto.stock,
          reservedStock: existing.reservedStock,
        },
      });
    }

    await this.outletsRepository.setInventoryAudited(
      outletId,
      variantId,
      dto.stock,
      { note: dto.note, actorId }
    );
    const view = await this.outletsRepository.findInventoryView(
      outletId,
      variantId
    );
    if (!view) {
      throw OutletInventoryNotFoundException({
        details: { outletId, variantId },
      });
    }
    return this.toInventoryResponse(view);
  }

  async getInventory(
    outletId: number,
    variantId: number
  ): Promise<InventoryResponseDto> {
    await this.getOutletOrThrow(outletId);
    const view = await this.outletsRepository.findInventoryView(
      outletId,
      variantId
    );
    if (!view) {
      throw OutletInventoryNotFoundException({
        details: { outletId, variantId },
      });
    }
    return this.toInventoryResponse(view);
  }

  async listInventory(
    outletId: number,
    query: OutletQueryDTO
  ): Promise<WithMetadata<InventoryResponseDto[]>> {
    await this.getOutletOrThrow(outletId);
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.outletsRepository.listInventory(
      outletId,
      decodeCursor(query.cursor),
      limit
    );
    const { items, meta } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((row) => this.toInventoryResponse(row)),
      metadata: meta,
    };
  }

  // ---------- ledger ----------

  /** Timeline jejak audit stok sebuah variant di sebuah outlet. */
  async listMovements(
    outletId: number,
    variantId: number,
    query: CursorQueryDTO
  ): Promise<WithMetadata<MovementResponseDto[]>> {
    await this.getOutletOrThrow(outletId);
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.outletsRepository.listMovements(
      outletId,
      variantId,
      decodeCursor(query.cursor),
      limit
    );
    const { items, meta } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map(
        (row) =>
          new MovementResponseDto({
            id: row.id,
            outletId: row.outletId,
            variantId: row.variantId,
            type: row.type,
            stockChange: row.stockChange,
            reservedChange: row.reservedChange,
            stockAfter: row.stockAfter,
            reservedAfter: row.reservedAfter,
            refType: row.refType,
            refId: row.refId,
            actorId: row.actorId,
            note: row.note,
            createdAt: row.createdAt,
          })
      ),
      metadata: meta,
    };
  }

  // ---------- helpers ----------

  private async getOutletOrThrow(id: number): Promise<SelectOutlet> {
    const outlet = await this.outletsRepository.findById(id);
    if (!outlet) {
      throw OutletNotFoundException({ details: { id } });
    }
    return outlet;
  }

  /** Susun payload insert/update hanya dari field yang dikirim. */
  private toPayload(dto: UpdateOutletDTO): Partial<InsertOutlet> {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.street !== undefined ? { street: dto.street } : {}),
      ...(dto.district !== undefined ? { district: dto.district } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.province !== undefined ? { province: dto.province } : {}),
      ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
      ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.servesOnline !== undefined
        ? { servesOnline: dto.servesOnline }
        : {}),
      ...(dto.isOnlineDefault !== undefined
        ? { isOnlineDefault: dto.isOnlineDefault }
        : {}),
      ...(dto.openingHours !== undefined
        ? { openingHours: dto.openingHours }
        : {}),
    };
  }

  private toOutletResponse(outlet: SelectOutlet): OutletResponseDto {
    return new OutletResponseDto({
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      street: outlet.street,
      district: outlet.district,
      city: outlet.city,
      province: outlet.province,
      postalCode: outlet.postalCode,
      phone: outlet.phone,
      email: outlet.email,
      latitude: outlet.latitude,
      longitude: outlet.longitude,
      isActive: outlet.isActive,
      servesOnline: outlet.servesOnline,
      isOnlineDefault: outlet.isOnlineDefault,
      openingHours: outlet.openingHours,
      createdAt: outlet.createdAt,
      updatedAt: outlet.updatedAt,
    });
  }

  private toInventoryResponse(view: InventoryView): InventoryResponseDto {
    return new InventoryResponseDto({
      outletId: view.outletId,
      variantId: view.variantId,
      skuCode: view.skuCode,
      variantName: view.variantName,
      productName: view.productName,
      stock: view.stock,
      reservedStock: view.reservedStock,
      availableStock: view.stock - view.reservedStock,
      updatedAt: view.updatedAt,
    });
  }
}
