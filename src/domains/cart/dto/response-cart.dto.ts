import { Expose } from 'class-transformer';

export interface CartOutletResponse {
  id: number;
  name: string;
  code: string;
  city: string | null;
  province: string | null;
}

export interface CartItemResponse {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  /** Harga satuan sebelum diskon (Rupiah penuh). */
  unitPrice: number;
  /** Potongan per satuan dari diskon aktif berprioritas tertinggi. */
  discountAmount: number;
  /** Harga satuan setelah diskon. */
  finalUnitPrice: number;
  quantity: number;
  /** finalUnitPrice * quantity. */
  lineTotal: number;
  /** Variant & product masih aktif (bisa dibeli). */
  isPurchasable: boolean;
  /** Stok tersedia di outlet terpilih; null bila outlet belum dipilih. */
  availableStock: number | null;
  /** Stok outlet mencukupi qty; null bila outlet belum dipilih. */
  isStockSufficient: boolean | null;
}

export class CartResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  outlet: CartOutletResponse | null;

  @Expose()
  items: CartItemResponse[];

  /** Jumlah harga sebelum diskon. */
  @Expose()
  subtotal: number;

  @Expose()
  discountTotal: number;

  /** subtotal - discountTotal (ongkir dihitung saat checkout). */
  @Expose()
  total: number;

  /** Seluruh item purchasable & stok cukup; null bila outlet belum dipilih. */
  @Expose()
  allItemsAvailable: boolean | null;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<CartResponseDto>) {
    Object.assign(this, partial);
  }
}
