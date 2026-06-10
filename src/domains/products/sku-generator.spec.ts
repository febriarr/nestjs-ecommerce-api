import { buildSkuCode } from './sku-generator';

describe('buildSkuCode', () => {
  it('menggabungkan brand + slug + attribute values', () => {
    expect(
      buildSkuCode({
        brandName: 'Nike',
        productSlug: 'air-max',
        valueLabels: ['Red', '42'],
      })
    ).toBe('NIK-AIR-MAX-RED-42');
  });

  it('melewati brand bila tidak ada', () => {
    expect(
      buildSkuCode({
        brandName: null,
        productSlug: 'air-max',
        valueLabels: ['Red'],
      })
    ).toBe('AIR-MAX-RED');
  });

  it('membedakan produk dengan slug berbeda (iphone family)', () => {
    const a = buildSkuCode({
      brandName: 'Apple',
      productSlug: 'iphone-17-pro',
      valueLabels: ['Black', '256'],
    });
    const b = buildSkuCode({
      brandName: 'Apple',
      productSlug: 'iphone-17-pro-max',
      valueLabels: ['Black', '256'],
    });
    expect(a).toBe('APP-IPHONE-17-PRO-BLA-256');
    expect(b).toBe('APP-IPHONE-17-PRO-MAX-BLA-256');
    expect(a).not.toBe(b);
  });

  it('membersihkan karakter non-alfanumerik pada singkatan', () => {
    expect(
      buildSkuCode({
        brandName: 'A&W',
        productSlug: 'root-beer',
        valueLabels: ['1 L'],
      })
    ).toBe('AW-ROOT-BEER-1L');
  });
});
