import { Expose } from 'class-transformer';

export class InventoryResponseDto {
  @Expose()
  outletId: number;

  @Expose()
  variantId: number;

  @Expose()
  skuCode: string;

  @Expose()
  variantName: string | null;

  @Expose()
  productName: string;

  @Expose()
  stock: number;

  @Expose()
  reservedStock: number;

  /** Stok yang benar-benar bisa dijual = stock - reservedStock. */
  @Expose()
  availableStock: number;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<InventoryResponseDto>) {
    Object.assign(this, partial);
  }
}
