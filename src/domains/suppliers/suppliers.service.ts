import { Injectable } from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDTO } from './dto/create-supplier.dto';
import { UpdateSupplierDTO } from './dto/update-supplier.dto';
import { SupplierQueryDTO } from './dto/supplier-query.dto';
import { SupplierResponseDto } from './dto/response-supplier.dto';
import { SelectSupplier } from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildCursorPage,
  decodeCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  SupplierCodeConflictException,
  SupplierNotFoundException,
} from '../../common/exceptions/domains/supplier.exceptions';

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async create(dto: CreateSupplierDTO): Promise<SupplierResponseDto> {
    if (await this.suppliersRepository.findByCode(dto.code)) {
      throw SupplierCodeConflictException({ details: { code: dto.code } });
    }
    const supplier = await this.suppliersRepository.insert({
      name: dto.name,
      code: dto.code,
      contactName: dto.contactName ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return this.toResponse(supplier);
  }

  async findById(id: number): Promise<SupplierResponseDto> {
    return this.toResponse(await this.getSupplierOrThrow(id));
  }

  async list(
    query: SupplierQueryDTO
  ): Promise<WithMetadata<SupplierResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.suppliersRepository.list(
      { isActive: query.isActive, search: query.search },
      decodeCursor(query.cursor),
      limit
    );
    const { items, meta } = buildCursorPage(rows, limit, (row) => row.id);
    return {
      data: items.map((supplier) => this.toResponse(supplier)),
      metadata: meta,
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierDTO
  ): Promise<SupplierResponseDto> {
    const existing = await this.getSupplierOrThrow(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      if (await this.suppliersRepository.findByCode(dto.code)) {
        throw SupplierCodeConflictException({ details: { code: dto.code } });
      }
    }

    const supplier = await this.suppliersRepository.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.contactName !== undefined
        ? { contactName: dto.contactName }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return this.toResponse(supplier);
  }

  async softDelete(id: number): Promise<void> {
    await this.getSupplierOrThrow(id);
    await this.suppliersRepository.softDelete(id);
  }

  private async getSupplierOrThrow(id: number): Promise<SelectSupplier> {
    const supplier = await this.suppliersRepository.findById(id);
    if (!supplier) {
      throw SupplierNotFoundException({ details: { id } });
    }
    return supplier;
  }

  private toResponse(supplier: SelectSupplier): SupplierResponseDto {
    return new SupplierResponseDto({
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    });
  }
}
