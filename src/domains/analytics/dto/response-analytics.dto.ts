import { Expose } from 'class-transformer';

/**
 * Definisi metrik (konsisten di seluruh endpoint):
 * - Revenue = orders.total (TERMASUK ongkir) dengan basis paidAt,
 *   status PAID maupun yang kemudian REFUNDED — refund dilaporkan sebagai
 *   rate terpisah, bukan pengurang diam-diam.
 * - Revenue per kategori/produk memakai order_items.lineTotal
 *   (harga setelah diskon, TANPA ongkir) — totalnya bisa lebih kecil
 *   dari revenue summary; itu by-design.
 * - Seluruh nominal integer Rupiah penuh.
 */

export interface PeriodTotals {
  revenue: number;
  orders: number;
  /** Average Order Value = revenue / orders. */
  aov: number;
}

export interface GrowthPct {
  /** Persen perubahan; null bila pembanding 0 (tampilkan "—"). */
  revenuePct: number | null;
  ordersPct: number | null;
  aovPct: number | null;
}

export class SalesSummaryResponseDto {
  @Expose()
  range: { from: string; to: string };

  @Expose()
  current: PeriodTotals;

  /** Periode tepat sebelumnya dengan durasi sama (basis MoM). */
  @Expose()
  previousPeriod: PeriodTotals;

  @Expose()
  growthVsPrevious: GrowthPct;

  /** Periode sama tahun lalu (basis YoY). */
  @Expose()
  lastYearPeriod: PeriodTotals;

  @Expose()
  growthVsLastYear: GrowthPct;

  @Expose()
  refund: { count: number; amount: number; ratePct: number };

  @Expose()
  cancellation: {
    created: number;
    cancelled: number;
    expired: number;
    ratePct: number;
  };

  constructor(partial: Partial<SalesSummaryResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface SeriesPoint {
  /** Tanggal awal bucket (YYYY-MM-DD, timezone analytics). */
  bucket: string;
  revenue: number;
  orders: number;
  aov: number;
}

export class SalesSeriesResponseDto {
  @Expose()
  range: { from: string; to: string };

  @Expose()
  interval: string;

  @Expose()
  points: SeriesPoint[];

  constructor(partial: Partial<SalesSeriesResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface CategorySalesRow {
  categoryId: string;
  categoryName: string;
  quantity: number;
  revenue: number;
}

export class SalesByCategoryResponseDto {
  @Expose()
  range: { from: string; to: string };

  @Expose()
  rows: CategorySalesRow[];

  constructor(partial: Partial<SalesByCategoryResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface BestSellerRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  quantity: number;
  revenue: number;
}

export class BestSellersResponseDto {
  @Expose()
  range: { from: string; to: string };

  @Expose()
  sort: string;

  @Expose()
  rows: BestSellerRow[];

  constructor(partial: Partial<BestSellersResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface SlowMovingRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  /** Stok tersedia (stock - reserved) lintas outlet. */
  availableStock: number;
  /** Nilai stok tertahan = availableStock * harga jual. */
  stockValue: number;
  /** Null = belum pernah terjual (dead stock). */
  lastSoldAt: string | null;
}

export class SlowMovingResponseDto {
  @Expose()
  days: number;

  @Expose()
  rows: SlowMovingRow[];

  constructor(partial: Partial<SlowMovingResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface StockAlertRow {
  outletId: number;
  outletName: string;
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  availableStock: number;
}

export class StockAlertsResponseDto {
  @Expose()
  threshold: number;

  @Expose()
  outOfStock: StockAlertRow[];

  @Expose()
  lowStock: StockAlertRow[];

  constructor(partial: Partial<StockAlertsResponseDto>) {
    Object.assign(this, partial);
  }
}

export interface ProductConversionRow {
  productId: number;
  productName: string;
  views: number;
  /** Qty terjual (paid) pada rentang yang sama. */
  purchased: number;
  /** purchased / views * 100 (1 desimal); null bila views 0. */
  conversionPct: number | null;
}

export class ProductConversionResponseDto {
  @Expose()
  range: { from: string; to: string };

  @Expose()
  rows: ProductConversionRow[];

  constructor(partial: Partial<ProductConversionResponseDto>) {
    Object.assign(this, partial);
  }
}
