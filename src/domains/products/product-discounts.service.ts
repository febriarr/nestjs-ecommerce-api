import { Injectable } from '@nestjs/common';
import { ProductDiscountsRepository } from './product-discounts.repository';
import { ProductsRepository } from './products.repository';
import { CreateDiscountDTO } from './dto/create-discount.dto';
import { UpdateDiscountDTO } from './dto/update-discount.dto';
import { DiscountResponseDto } from './dto/response-discount.dto';
import {
  DiscountType,
  InsertProductDiscount,
  SelectProductDiscount,
} from '../../infrastructure/database/schema';
import { ProductNotFoundException } from '../../common/exceptions/domains/product.exceptions';
import {
  DiscountInvalidException,
  DiscountNotFoundException,
} from '../../common/exceptions/domains/product-discount.exceptions';

interface DiscountFields {
  type: DiscountType;
  percentage: number | null;
  fixedAmount: number | null;
  maxDiscount: number | null;
  startAt: Date;
  endAt: Date;
}

@Injectable()
export class ProductDiscountsService {
  constructor(
    private readonly repo: ProductDiscountsRepository,
    private readonly productsRepo: ProductsRepository
  ) {}

  async create(
    productId: number,
    dto: CreateDiscountDTO
  ): Promise<DiscountResponseDto> {
    await this.assertProduct(productId);

    const fields: DiscountFields = {
      type: dto.type,
      percentage: dto.percentage ?? null,
      fixedAmount: dto.fixedAmount ?? null,
      maxDiscount: dto.maxDiscount ?? null,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    };
    this.validate(fields);

    const payload: InsertProductDiscount = {
      productId,
      type: fields.type,
      percentage: fields.percentage,
      fixedAmount: fields.fixedAmount,
      maxDiscount: fields.maxDiscount,
      startAt: fields.startAt,
      endAt: fields.endAt,
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    const row = await this.repo.insert(payload);
    return new DiscountResponseDto(row);
  }

  async list(productId: number): Promise<DiscountResponseDto[]> {
    await this.assertProduct(productId);
    const rows = await this.repo.listByProduct(productId);
    return rows.map((r) => new DiscountResponseDto(r));
  }

  async findById(
    productId: number,
    discountId: number
  ): Promise<DiscountResponseDto> {
    const row = await this.getDiscountOrThrow(productId, discountId);
    return new DiscountResponseDto(row);
  }

  async update(
    productId: number,
    discountId: number,
    dto: UpdateDiscountDTO
  ): Promise<DiscountResponseDto> {
    const existing = await this.getDiscountOrThrow(productId, discountId);

    const fields: DiscountFields = {
      type: dto.type ?? existing.type,
      percentage:
        dto.percentage !== undefined ? dto.percentage : existing.percentage,
      fixedAmount:
        dto.fixedAmount !== undefined ? dto.fixedAmount : existing.fixedAmount,
      maxDiscount:
        dto.maxDiscount !== undefined ? dto.maxDiscount : existing.maxDiscount,
      startAt: dto.startAt ? new Date(dto.startAt) : existing.startAt,
      endAt: dto.endAt ? new Date(dto.endAt) : existing.endAt,
    };
    this.validate(fields);

    const row = await this.repo.update(discountId, {
      ...fields,
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return new DiscountResponseDto(row);
  }

  async delete(productId: number, discountId: number): Promise<void> {
    await this.getDiscountOrThrow(productId, discountId);
    await this.repo.delete(discountId);
  }

  // ---------- helpers ----------

  private validate(fields: DiscountFields): void {
    if (fields.endAt <= fields.startAt)
      throw DiscountInvalidException({
        details: { reason: 'endAt harus setelah startAt' },
      });

    if (fields.type === 'PERCENTAGE') {
      if (fields.percentage === null)
        throw DiscountInvalidException({
          details: { reason: 'percentage wajib untuk type PERCENTAGE' },
        });
    } else {
      if (fields.fixedAmount === null)
        throw DiscountInvalidException({
          details: { reason: 'fixedAmount wajib untuk type FIXED' },
        });
    }
  }

  private async assertProduct(productId: number): Promise<void> {
    if (!(await this.productsRepo.findById(productId)))
      throw ProductNotFoundException({ details: { id: productId } });
  }

  private async getDiscountOrThrow(
    productId: number,
    discountId: number
  ): Promise<SelectProductDiscount> {
    const row = await this.repo.findById(discountId);
    if (!row || row.productId !== productId)
      throw DiscountNotFoundException({ details: { productId, discountId } });
    return row;
  }
}
