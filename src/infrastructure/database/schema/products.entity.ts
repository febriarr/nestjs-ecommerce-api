import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';
import { categories } from './categories.entity';
import { brands } from './brands.entity';
import { users } from './users.entity';
import { attributes } from './attributes.entity';

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'inactive',
]);
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];

export const discountTypeEnum = pgEnum('discount_type', [
  'PERCENTAGE',
  'FIXED',
]);
export type DiscountType = (typeof discountTypeEnum.enumValues)[number];

/**
 * products — entitas katalog utama. Harga TIDAK disimpan di sini (ada di
 * product_variants); `minPrice` hanyalah nilai cache dari variant termurah
 * untuk mempercepat sorting/listing.
 */
export const products = pgTable(
  'products',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 300 }),
    // categories.id bertipe uuid
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    // brands.id bertipe bigserial → bigint; nullable
    brandId: bigint('brand_id', { mode: 'number' }).references(
      () => brands.id,
      { onDelete: 'set null' }
    ),
    status: productStatusEnum('status').default('draft').notNull(),
    /**
     * Thumbnail mereferensikan satu gambar di product_media (single source of
     * truth) — bukan URL lepas. Null bila belum di-set; set null bila media dihapus.
     */
    thumbnailMediaId: bigint('thumbnail_media_id', {
      mode: 'number',
    }).references((): AnyPgColumn => productMedia.id, { onDelete: 'set null' }),
    /** Cache harga variant termurah (null bila belum ada variant berharga). */
    minPrice: bigint('min_price', { mode: 'number' }),
    // users.id bertipe uuid
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('products_slug_idx').on(t.slug),
    index('products_category_id_idx').on(t.categoryId),
    index('products_brand_id_idx').on(t.brandId),
    index('products_status_idx').on(t.status),
    // listing/sort katalog: produk aktif diurutkan harga
    index('products_status_min_price_idx').on(t.status, t.minPrice),
    index('products_created_by_idx').on(t.createdBy),
    index('products_thumbnail_media_id_idx').on(t.thumbnailMediaId),
  ]
);

/**
 * product_attributes — menentukan attribute apa saja yang dipakai sebuah
 * product (mis. T-Shirt → Color, Size). Bukan nilainya, hanya definisinya.
 */
export const productAttributes = pgTable(
  'product_attributes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    attributeId: bigint('attribute_id', { mode: 'number' })
      .notNull()
      .references(() => attributes.id, { onDelete: 'restrict' }),
    isRequired: boolean('is_required').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('product_attributes_unique_idx').on(t.productId, t.attributeId),
    index('product_attributes_product_id_idx').on(t.productId),
    index('product_attributes_attribute_id_idx').on(t.attributeId),
  ]
);

/**
 * product_media — media library milik product. Setiap gambar disimpan SEKALI
 * di sini; variant hanya mereferensikan (lihat variant_media) → tanpa duplikat.
 */
export const productMedia = pgTable(
  'product_media',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    imageUrl: varchar('image_url', { length: 512 }).notNull(),
    imageAlt: varchar('image_alt', { length: 255 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('product_media_product_id_idx').on(t.productId),
    // satu URL hanya boleh muncul sekali per product (anti-duplikat)
    uniqueIndex('product_media_product_url_idx').on(t.productId, t.imageUrl),
  ]
);

/**
 * product_discounts — promo terjadwal. Mendukung dua jenis:
 *  - PERCENTAGE: actualDiscount = MIN(price * percentage / 100, maxDiscount)
 *  - FIXED: actualDiscount = MIN(fixedAmount, price)
 *
 * Bila beberapa promo aktif bersamaan, `priority` (besar menang) dipakai untuk
 * memilih; resolusi dilakukan di service layer.
 */
export const productDiscounts = pgTable(
  'product_discounts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    type: discountTypeEnum('type').default('PERCENTAGE').notNull(),
    /** Untuk type PERCENTAGE (mis. 20.00); null untuk FIXED. */
    percentage: numeric('percentage', {
      precision: 5,
      scale: 2,
      mode: 'number',
    }),
    /** Untuk type FIXED: potongan tetap dalam Rupiah; null untuk PERCENTAGE. */
    fixedAmount: bigint('fixed_amount', { mode: 'number' }),
    /** Batas potongan (hanya PERCENTAGE); null = tanpa cap. */
    maxDiscount: bigint('max_discount', { mode: 'number' }),
    /** Prioritas pemilihan saat promo aktif tumpang tindih (besar menang). */
    priority: integer('priority').default(0).notNull(),
    startAt: timestamp('start_at', {
      mode: 'date',
      withTimezone: true,
    }).notNull(),
    endAt: timestamp('end_at', { mode: 'date', withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index('product_discounts_product_id_idx').on(t.productId),
    // query promo aktif untuk sebuah product pada rentang waktu tertentu
    index('product_discounts_active_window_idx').on(
      t.productId,
      t.isActive,
      t.startAt,
      t.endAt
    ),
    // pemilihan promo berdasarkan prioritas
    index('product_discounts_priority_idx').on(
      t.productId,
      t.isActive,
      t.priority
    ),
  ]
);

// products
export type InsertProduct = typeof products.$inferInsert;
export type SelectProduct = typeof products.$inferSelect;

// product_attributes
export type InsertProductAttribute = typeof productAttributes.$inferInsert;
export type SelectProductAttribute = typeof productAttributes.$inferSelect;

// product_media
export type InsertProductMedia = typeof productMedia.$inferInsert;
export type SelectProductMedia = typeof productMedia.$inferSelect;

// product_discounts
export type InsertProductDiscount = typeof productDiscounts.$inferInsert;
export type SelectProductDiscount = typeof productDiscounts.$inferSelect;
