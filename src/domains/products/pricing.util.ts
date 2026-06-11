import { SelectProductDiscount } from '../../infrastructure/database/schema';
import { computeDiscount } from './discount.util';

export interface ItemPricing {
  /** Harga satuan sebelum diskon. */
  unitPrice: number;
  /** Potongan per satuan. */
  discountAmount: number;
  /** Harga satuan setelah diskon. */
  finalUnitPrice: number;
}

/**
 * Pilih satu diskon pemenang per product dari daftar diskon aktif yang SUDAH
 * diurutkan prioritas tertinggi dulu (lihat activeDiscounts* di repository) —
 * konsisten dengan resolusi "priority besar menang" di product_discounts.
 */
export function pickTopDiscounts(
  discounts: SelectProductDiscount[]
): Map<number, SelectProductDiscount> {
  const winners = new Map<number, SelectProductDiscount>();
  for (const discount of discounts) {
    if (!winners.has(discount.productId)) {
      winners.set(discount.productId, discount);
    }
  }
  return winners;
}

/** Hitung harga efektif sebuah variant terhadap diskon pemenang (bila ada). */
export function priceWithDiscount(
  price: number,
  discount: SelectProductDiscount | undefined
): ItemPricing {
  const discountAmount = discount ? computeDiscount(price, discount) : 0;
  return {
    unitPrice: price,
    discountAmount,
    finalUnitPrice: price - discountAmount,
  };
}
