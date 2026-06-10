const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format nominal menjadi Rupiah Indonesia (mis. `Rp1.500.000`). */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value);
}
