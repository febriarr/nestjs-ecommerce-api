import {
  pgTable,
  bigserial,
  bigint,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './products.entity';
import { productVariants } from './product-variants.entity';

/**
 * product_views — event view halaman produk (dicatat FE via
 * POST /events/product-view, publik + throttled). Sengaja anonim & ramping
 * (tanpa user/session) — dipakai untuk metrik "views vs purchases" per
 * produk di dashboard analytics; conversion visitor→order keseluruhan
 * memakai analytics eksternal.
 *
 * Append-only; bila volume membesar, kebijakan retensi/partisi per bulan
 * bisa ditambahkan tanpa mengubah API.
 */
export const productViews = pgTable(
  'product_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Variant yang sedang dilihat (opsional). */
    variantId: bigint('variant_id', { mode: 'number' }).references(
      () => productVariants.id,
      { onDelete: 'set null' }
    ),
    viewedAt: timestamp('viewed_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // agregasi views per produk dalam rentang waktu
    index('product_views_product_viewed_idx').on(t.productId, t.viewedAt),
    index('product_views_viewed_at_idx').on(t.viewedAt),
  ]
);

export type InsertProductView = typeof productViews.$inferInsert;
export type SelectProductView = typeof productViews.$inferSelect;
