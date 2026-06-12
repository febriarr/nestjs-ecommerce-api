import {
  averageOrderValue,
  lastYearRange,
  pctChange,
  previousRange,
} from './analytics.util';

describe('pctChange', () => {
  it('menghitung kenaikan persen 1 desimal', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(105, 100)).toBe(5);
    expect(pctChange(100, 150)).toBe(-33.3);
  });

  it('null bila pembanding 0 (hindari pembagian nol / ∞)', () => {
    expect(pctChange(100, 0)).toBeNull();
  });
});

describe('previousRange', () => {
  it('menggeser mundur dengan durasi sama (MoM-style)', () => {
    const range = {
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-07-01T00:00:00Z'),
    };
    const prev = previousRange(range);
    expect(prev.from.toISOString()).toBe('2026-05-02T00:00:00.000Z');
    expect(prev.to.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('lastYearRange', () => {
  it('menggeser kalender mundur 1 tahun (YoY)', () => {
    const range = {
      from: new Date('2026-06-01T00:00:00Z'),
      to: new Date('2026-07-01T00:00:00Z'),
    };
    const yoy = lastYearRange(range);
    expect(yoy.from.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(yoy.to.toISOString()).toBe('2025-07-01T00:00:00.000Z');
  });
});

describe('averageOrderValue', () => {
  it('revenue / orders dibulatkan ke Rupiah', () => {
    expect(averageOrderValue(1_000_000, 3)).toBe(333333);
  });

  it('0 bila belum ada order', () => {
    expect(averageOrderValue(0, 0)).toBe(0);
  });
});
