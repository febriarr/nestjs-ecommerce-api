import { computeDiscount } from './discount.util';

const base = {
  percentage: null,
  fixedAmount: null,
  maxDiscount: null,
} as const;

describe('computeDiscount', () => {
  it('PERCENTAGE tanpa cap', () => {
    expect(
      computeDiscount(100000, { ...base, type: 'PERCENTAGE', percentage: 20 })
    ).toBe(20000);
  });

  it('PERCENTAGE dengan maxDiscount', () => {
    expect(
      computeDiscount(1000000, {
        ...base,
        type: 'PERCENTAGE',
        percentage: 20,
        maxDiscount: 100000,
      })
    ).toBe(100000);
  });

  it('FIXED dipotong tetap', () => {
    expect(
      computeDiscount(100000, { ...base, type: 'FIXED', fixedAmount: 30000 })
    ).toBe(30000);
  });

  it('FIXED tidak melebihi harga', () => {
    expect(
      computeDiscount(20000, { ...base, type: 'FIXED', fixedAmount: 50000 })
    ).toBe(20000);
  });

  it('mengembalikan 0 bila percentage null pada PERCENTAGE', () => {
    expect(computeDiscount(100000, { ...base, type: 'PERCENTAGE' })).toBe(0);
  });

  it('membulatkan ke bawah', () => {
    expect(
      computeDiscount(99999, { ...base, type: 'PERCENTAGE', percentage: 10 })
    ).toBe(9999);
  });
});
