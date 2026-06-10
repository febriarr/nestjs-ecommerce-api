import { Expose } from 'class-transformer';

export class ProductMediaResponseDto {
  @Expose()
  id: number;

  @Expose()
  productId: number;

  /** URL publik gambar (di-resolve dari key storage). */
  @Expose()
  imageUrl: string | null;

  @Expose()
  imageAlt: string | null;

  @Expose()
  sortOrder: number;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<ProductMediaResponseDto>) {
    Object.assign(this, partial);
  }
}
