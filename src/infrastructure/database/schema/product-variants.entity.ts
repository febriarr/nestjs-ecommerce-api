import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  pgSequence,
  bigserial,
  bigint,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';
import { products, productMedia } from './products.entity';
import { attributes, attributeValues } from './attributes.entity';

export const variantStatusEnum = pgEnum('variant_status', [
  'active',
  'inactive',
]);
export type VariantStatus = (typeof variantStatusEnum.enumValues)[number];

/** Sequence untuk SKU publik numerik (skuNumber), mulai dari 1_000_000_000. */
export const variantSkuNumberSeq = pgSequence('variant_sku_number_seq', {
  startWith: 1000000000,
});

/**
 * product_variants — SKU konkret dari sebuah product (mis. "Red / 42").
 * Inilah unit yang punya harga & stok. Seluruh nominal dalam Rupiah penuh.
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** SKU publik numerik — auto dari sequence, tanpa input manual. */
    skuNumber: bigint('sku_number', { mode: 'number' })
      .notNull()
      .unique()
      .default(sql`nextval('variant_sku_number_seq')`),
    /** SKU internal human-readable (BRAND-CAT-VAL...); auto, bisa override. */
    skuCode: varchar('sku_code', { length: 100 }).notNull().unique(),
    variantName: varchar('variant_name', { length: 200 }),
    price: bigint('price', { mode: 'number' }).notNull(),
    compareAtPrice: bigint('compare_at_price', { mode: 'number' }),
    // Stok TIDAK disimpan di sini — per-outlet di outlet_inventory
    // (outletId + variantId + stock + reservedStock).
    /** Berat dalam gram (untuk ongkir). */
    weight: integer('weight'),
    isDefault: boolean('is_default').default(false).notNull(),
    status: variantStatusEnum('status').default('active').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('product_variants_sku_number_idx').on(t.skuNumber),
    uniqueIndex('product_variants_sku_code_idx').on(t.skuCode),
    index('product_variants_product_id_idx').on(t.productId),
    index('product_variants_status_idx').on(t.status),
    // hanya boleh ada SATU variant default per product
    uniqueIndex('product_variants_one_default_idx')
      .on(t.productId)
      .where(sql`${t.isDefault} = true`),
  ]
);

/**
 * variant_attributes — nilai attribute konkret dari sebuah variant
 * (mis. variant "Red / 42" → attribute value "Red" dan "42").
 *
 * `attributeId` disimpan redundan untuk menegakkan integritas: satu variant
 * hanya boleh punya SATU value per attribute (mencegah "Red" DAN "Black"
 * pada attribute Color yang sama) via unique(variantId, attributeId).
 */
export const variantAttributes = pgTable(
  'variant_attributes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    attributeId: bigint('attribute_id', { mode: 'number' })
      .notNull()
      .references(() => attributes.id, { onDelete: 'restrict' }),
    attributeValueId: bigint('attribute_value_id', { mode: 'number' })
      .notNull()
      .references(() => attributeValues.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // satu variant tepat satu value per attribute
    uniqueIndex('variant_attributes_variant_attribute_idx').on(
      t.variantId,
      t.attributeId
    ),
    // tidak boleh value yang sama dua kali pada variant
    uniqueIndex('variant_attributes_unique_idx').on(
      t.variantId,
      t.attributeValueId
    ),
    index('variant_attributes_variant_id_idx').on(t.variantId),
    index('variant_attributes_attribute_value_id_idx').on(t.attributeValueId),
  ]
);

/**
 * variant_media — join antara variant dan product_media. Variant TIDAK
 * menyimpan URL sendiri; ia hanya mereferensikan gambar dari product_media,
 * sehingga gambar bisa direuse antar variant tanpa duplikat.
 *
 * Composite PK (variant_id, media_id) sekaligus mencegah relasi ganda.
 * Catatan: integritas "media harus milik product yang sama dengan variant"
 * divalidasi di service layer (tidak dapat di-enforce murah di DB).
 */
export const variantMedia = pgTable(
  'variant_media',
  {
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    mediaId: bigint('media_id', { mode: 'number' })
      .notNull()
      .references(() => productMedia.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.mediaId] }),
    index('variant_media_media_id_idx').on(t.mediaId),
  ]
);

// product_variants
export type InsertProductVariant = typeof productVariants.$inferInsert;
export type SelectProductVariant = typeof productVariants.$inferSelect;

// variant_attributes
export type InsertVariantAttribute = typeof variantAttributes.$inferInsert;
export type SelectVariantAttribute = typeof variantAttributes.$inferSelect;

// variant_media
export type InsertVariantMedia = typeof variantMedia.$inferInsert;
export type SelectVariantMedia = typeof variantMedia.$inferSelect;
