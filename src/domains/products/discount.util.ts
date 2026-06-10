import { SelectProductDiscount } from '../../infrastructure/database/schema';

/**
 * Hitung nominal potongan (Rupiah) dari sebuah diskon terhadap harga.
 *  - PERCENTAGE: MIN(price * percentage / 100, maxDiscount ?? ∞)
 *  - FIXED: MIN(fixedAmount, price)
 * Hasil dibulatkan ke bawah dan tidak melebihi harga.
 */
export function computeDiscount(
  price: number,
  discount: Pick<
    SelectProductDiscount,
    'type' | 'percentage' | 'fixedAmount' | 'maxDiscount'
  >
): number {
  let amount = 0;
  if (discount.type === 'PERCENTAGE' && discount.percentage !== null) {
    amount = Math.floor((price * discount.percentage) / 100);
    if (discount.maxDiscount !== null) {
      amount = Math.min(amount, discount.maxDiscount);
    }
  } else if (discount.type === 'FIXED' && discount.fixedAmount !== null) {
    amount = discount.fixedAmount;
  }
  return Math.max(0, Math.min(amount, price));
}
