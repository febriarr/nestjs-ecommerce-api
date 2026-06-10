import { formatRupiah } from './currency.util';

describe('formatRupiah', () => {
  it('memformat angka sebagai Rupiah tanpa desimal', () => {
    const result = formatRupiah(1500000);
    expect(result.startsWith('Rp')).toBe(true);
    expect(result).toContain('1.500.000');
    expect(result).not.toContain(',');
  });

  it('memformat nol', () => {
    expect(formatRupiah(0)).toContain('0');
  });
});
