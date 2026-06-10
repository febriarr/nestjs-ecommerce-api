import { Expose } from 'class-transformer';
import type { ProductStatus } from '../../../infrastructure/database/schema';

export class ProductResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string | null;

  @Expose()
  shortDescription: string | null;

  @Expose()
  categoryId: string;

  @Expose()
  brandId: number | null;

  @Expose()
  status: ProductStatus;

  @Expose()
  thumbnailMediaId: number | null;

  /** URL publik thumbnail (null bila belum di-set). */
  @Expose()
  thumbnailUrl: string | null;

  @Expose()
  minPrice: number | null;

  @Expose()
  createdBy: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ProductResponseDto>) {
    Object.assign(this, partial);
  }
}
