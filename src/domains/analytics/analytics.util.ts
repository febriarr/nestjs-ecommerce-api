/** Util murni perhitungan periode & growth untuk analytics dashboard. */

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Persentase perubahan current vs previous (1 desimal).
 * Null bila pembanding 0/negatif — FE menampilkan "—" alih-alih ∞.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Periode pembanding tepat sebelum `range` dengan durasi sama (basis MoM). */
export function previousRange(range: DateRange): DateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - durationMs),
    to: new Date(range.from.getTime()),
  };
}

/** Periode yang sama tahun lalu — geser kalender, durasi dipertahankan (YoY). */
export function lastYearRange(range: DateRange): DateRange {
  const from = new Date(range.from);
  from.setFullYear(from.getFullYear() - 1);
  const to = new Date(range.to);
  to.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

/** AOV = revenue / jumlah order (0 bila belum ada order), dibulatkan Rupiah. */
export function averageOrderValue(revenue: number, orders: number): number {
  return orders > 0 ? Math.round(revenue / orders) : 0;
}
