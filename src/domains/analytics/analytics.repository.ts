import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  categories,
  orderItems,
  orders,
  outletInventory,
  outlets,
  products,
  productVariants,
  productViews,
} from '../../infrastructure/database/schema';
import { DateRange } from './analytics.util';
import {
  BestSellerRow,
  CategorySalesRow,
  StockAlertRow,
} from './dto/response-analytics.dto';

/** Status order yang dihitung sebagai penjualan (basis paidAt). */
const PAID_STATUSES = ['PAID', 'REFUNDED'] as const;

export interface PaidTotalsRow {
  revenue: number;
  orders: number;
}

export interface SeriesRow {
  bucket: string;
  revenue: number;
  orders: number;
}

export interface SlowMovingRawRow {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  availableStock: number;
  stockValue: number;
  lastSoldAt: Date | null;
}

export interface ConversionRawRow {
  productId: number;
  productName: string;
  views: number;
  purchased: number;
}

@Injectable()
export class AnalyticsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- sales ----------

  /** Revenue (orders.total, termasuk ongkir) + jumlah order, basis paidAt. */
  async paidTotals(range: DateRange): Promise<PaidTotalsRow> {
    const rows = await this.db
      .select({
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::float8`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          inArray(orders.status, [...PAID_STATUSES]),
          gte(orders.paidAt, range.from),
          lt(orders.paidAt, range.to)
        )
      );
    return rows[0] ?? { revenue: 0, orders: 0 };
  }

  /** Refund pada rentang (basis refundedAt). */
  async refundTotals(
    range: DateRange
  ): Promise<{ count: number; amount: number }> {
    const rows = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${orders.total}), 0)::float8`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          eq(orders.status, 'REFUNDED'),
          gte(orders.refundedAt, range.from),
          lt(orders.refundedAt, range.to)
        )
      );
    return rows[0] ?? { count: 0, amount: 0 };
  }

  /** Order dibuat pada rentang (basis createdAt) — penyebut cancellation rate. */
  async createdCount(range: DateRange): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          gte(orders.createdAt, range.from),
          lt(orders.createdAt, range.to)
        )
      );
    return rows[0]?.count ?? 0;
  }

  /** Jumlah order berstatus tertentu pada rentang (basis cancelledAt). */
  async cancelledCount(
    range: DateRange,
    status: 'CANCELLED' | 'EXPIRED'
  ): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          eq(orders.status, status),
          gte(orders.cancelledAt, range.from),
          lt(orders.cancelledAt, range.to)
        )
      );
    return rows[0]?.count ?? 0;
  }

  /** Time series revenue/order per bucket (date_trunc pada timezone lokal). */
  async series(
    interval: string,
    range: DateRange,
    timezone: string
  ): Promise<SeriesRow[]> {
    const bucket = sql<string>`to_char(date_trunc(${interval}, ${orders.paidAt} at time zone ${timezone}), 'YYYY-MM-DD')`;
    return this.db
      .select({
        bucket,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)::float8`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          isNull(orders.deletedAt),
          inArray(orders.status, [...PAID_STATUSES]),
          gte(orders.paidAt, range.from),
          lt(orders.paidAt, range.to)
        )
      )
      .groupBy(bucket)
      .orderBy(bucket);
  }

  /** Revenue & qty per kategori (lineTotal — tanpa ongkir). */
  async salesByCategory(range: DateRange): Promise<CategorySalesRow[]> {
    return this.db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        quantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::float8`,
      })
      .from(orderItems)
      .innerJoin(
        orders,
        and(
          eq(orderItems.orderId, orders.id),
          isNull(orders.deletedAt),
          inArray(orders.status, [...PAID_STATUSES]),
          gte(orders.paidAt, range.from),
          lt(orders.paidAt, range.to)
        )
      )
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(sql`sum(${orderItems.lineTotal})`));
  }

  /** Best seller per variant; sort by quantity atau revenue. */
  async bestSellers(
    range: DateRange,
    limit: number,
    sort: 'quantity' | 'revenue'
  ): Promise<BestSellerRow[]> {
    const quantity = sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`;
    const revenue = sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::float8`;
    return this.db
      .select({
        variantId: orderItems.variantId,
        productId: orderItems.productId,
        productName: products.name,
        variantName: productVariants.variantName,
        skuCode: productVariants.skuCode,
        quantity,
        revenue,
      })
      .from(orderItems)
      .innerJoin(
        orders,
        and(
          eq(orderItems.orderId, orders.id),
          isNull(orders.deletedAt),
          inArray(orders.status, [...PAID_STATUSES]),
          gte(orders.paidAt, range.from),
          lt(orders.paidAt, range.to)
        )
      )
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .groupBy(
        orderItems.variantId,
        orderItems.productId,
        products.name,
        productVariants.variantName,
        productVariants.skuCode
      )
      .orderBy(
        sort === 'quantity'
          ? desc(sql`sum(${orderItems.quantity})`)
          : desc(sql`sum(${orderItems.lineTotal})`)
      )
      .limit(limit);
  }

  // ---------- product / stock ----------

  /**
   * Variant ber-stok yang tak terjual ≥ N hari (atau belum pernah) —
   * diurutkan dari nilai stok tertahan terbesar.
   */
  async slowMoving(days: number, limit: number): Promise<SlowMovingRawRow[]> {
    const result = await this.db.execute(sql`
      with stock as (
        select variant_id, sum(stock - reserved_stock)::int as available
        from outlet_inventory
        group by variant_id
        having sum(stock - reserved_stock) > 0
      ),
      last_sale as (
        select oi.variant_id, max(o.paid_at) as last_sold
        from order_items oi
        join orders o on o.id = oi.order_id
          and o.deleted_at is null
          and o.status in ('PAID', 'REFUNDED')
        group by oi.variant_id
      )
      select
        v.id as "variantId",
        p.id as "productId",
        p.name as "productName",
        v.variant_name as "variantName",
        v.sku_code as "skuCode",
        s.available as "availableStock",
        (s.available::bigint * v.price)::float8 as "stockValue",
        ls.last_sold as "lastSoldAt"
      from stock s
      join product_variants v on v.id = s.variant_id and v.deleted_at is null
      join products p on p.id = v.product_id and p.deleted_at is null
      left join last_sale ls on ls.variant_id = s.variant_id
      where ls.last_sold is null
        or ls.last_sold < now() - make_interval(days => ${days})
      order by (s.available::bigint * v.price) desc
      limit ${limit}
    `);
    return result.rows as unknown as SlowMovingRawRow[];
  }

  /** Baris inventori dengan available ≤ threshold (variant aktif saja). */
  async stockAlerts(
    threshold: number,
    outletId?: number
  ): Promise<StockAlertRow[]> {
    const available = sql<number>`(${outletInventory.stock} - ${outletInventory.reservedStock})::int`;
    const conditions = [
      isNull(outlets.deletedAt),
      isNull(productVariants.deletedAt),
      eq(productVariants.status, 'active'),
      sql`${outletInventory.stock} - ${outletInventory.reservedStock} <= ${threshold}`,
    ];
    if (outletId !== undefined)
      conditions.push(eq(outletInventory.outletId, outletId));

    return this.db
      .select({
        outletId: outletInventory.outletId,
        outletName: outlets.name,
        variantId: outletInventory.variantId,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.variantName,
        skuCode: productVariants.skuCode,
        availableStock: available,
      })
      .from(outletInventory)
      .innerJoin(outlets, eq(outletInventory.outletId, outlets.id))
      .innerJoin(
        productVariants,
        eq(outletInventory.variantId, productVariants.id)
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(...conditions))
      .orderBy(available, products.name);
  }

  // ---------- product views / conversion ----------

  async productExists(productId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(isNull(products.deletedAt), eq(products.id, productId)))
      .limit(1);
    return rows.length > 0;
  }

  async insertView(productId: number, variantId: number | null): Promise<void> {
    await this.db.insert(productViews).values({ productId, variantId });
  }

  /** Views vs qty terbeli (paid) per produk pada rentang yang sama. */
  async productConversion(
    range: DateRange,
    limit: number
  ): Promise<ConversionRawRow[]> {
    const result = await this.db.execute(sql`
      with views as (
        select product_id, count(*)::int as views
        from product_views
        where viewed_at >= ${range.from} and viewed_at < ${range.to}
        group by product_id
      ),
      sales as (
        select oi.product_id, sum(oi.quantity)::int as qty
        from order_items oi
        join orders o on o.id = oi.order_id
          and o.deleted_at is null
          and o.status in ('PAID', 'REFUNDED')
          and o.paid_at >= ${range.from} and o.paid_at < ${range.to}
        group by oi.product_id
      )
      select
        p.id as "productId",
        p.name as "productName",
        v.views as "views",
        coalesce(s.qty, 0)::int as "purchased"
      from views v
      join products p on p.id = v.product_id
      left join sales s on s.product_id = v.product_id
      order by v.views desc
      limit ${limit}
    `);
    return result.rows as unknown as ConversionRawRow[];
  }
}
