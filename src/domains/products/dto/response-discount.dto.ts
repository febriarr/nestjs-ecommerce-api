import { Expose } from 'class-transformer';
import type { DiscountType } from '../../../infrastructure/database/schema';

export class DiscountResponseDto {
  @Expose()
  id: number;

  @Expose()
  productId: number;

  @Expose()
  type: DiscountType;

  @Expose()
  percentage: number | null;

  @Expose()
  fixedAmount: number | null;

  @Expose()
  maxDiscount: number | null;

  @Expose()
  priority: number;

  @Expose()
  startAt: Date;

  @Expose()
  endAt: Date;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<DiscountResponseDto>) {
    Object.assign(this, partial);
  }
}
