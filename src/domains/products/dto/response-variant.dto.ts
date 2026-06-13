import { Expose } from 'class-transformer';
import type { VariantStatus } from '../../../infrastructure/database/schema';

export interface VariantAttributeResponse {
  attributeId: number;
  attributeName: string;
  attributeValueId: number;
  value: string;
  displayValue: string | null;
}

export interface VariantMediaResponse {
  mediaId: number;
  imageUrl: string | null;
  imageAlt: string | null;
  sortOrder: number;
  /** Gambar utama variant (ditampilkan di cart/listing). */
  isDefault: boolean;
}

export class VariantResponseDto {
  @Expose()
  id: number;

  @Expose()
  productId: number;

  /** SKU publik numerik. */
  @Expose()
  skuNumber: number;

  /** SKU internal human-readable. */
  @Expose()
  skuCode: string;

  @Expose()
  variantName: string | null;

  @Expose()
  price: number;

  @Expose()
  compareAtPrice: number | null;

  /** Total stok tersedia (stock - reserved) dijumlahkan lintas outlet. */
  @Expose()
  totalStock: number;

  @Expose()
  weight: number | null;

  @Expose()
  isDefault: boolean;

  @Expose()
  status: VariantStatus;

  @Expose()
  attributes: VariantAttributeResponse[];

  @Expose()
  media: VariantMediaResponse[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<VariantResponseDto>) {
    Object.assign(this, partial);
  }
}
