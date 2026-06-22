import { sql } from 'drizzle-orm';
import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  decimal,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';
import { productVariants } from './product-variants.entity';

/** Jam buka satu hari, format "HH:mm". Hari yang tidak ada berarti tutup. */
export interface OutletOpeningHoursEntry {
  open: string;
  close: string;
}

export type OutletOpeningHours = Partial<
  Record<
    'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
    OutletOpeningHoursEntry
  >
>;

/**
 * outlets — master cabang dalam SATU bisnis (multi-outlet, bukan multi-tenant).
 *
 * `servesOnline` menandai outlet yang melayani order web; `isOnlineDefault`
 * adalah fallback routing order online (maksimal satu, ditegakkan partial
 * unique index — pola sama dengan user_contacts.isPrimary).
 * `city`/`province`/koordinat dipakai untuk pemilihan outlet terdekat.
 */
export const outlets = pgTable(
  'outlets',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    /** Kode unik internal cabang (mis. "JKT-01"). */
    code: varchar('code', { length: 30 }).notNull().unique(),

    // Alamat (untuk kedekatan terhadap alamat kirim)
    street: text('street'),
    district: varchar('district', { length: 100 }),
    city: varchar('city', { length: 100 }),
    province: varchar('province', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),

    // Kontak
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Koordinat (opsional, untuk ranking jarak)
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    isActive: boolean('is_active').notNull().default(true),
    /** Melayani order dari web (kandidat routing order ONLINE). */
    servesOnline: boolean('serves_online').notNull().default(false),
    /** Fallback default routing online — idealnya tepat satu outlet. */
    isOnlineDefault: boolean('is_online_default').notNull().default(false),

    openingHours: jsonb('opening_hours').$type<OutletOpeningHours>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('outlets_code_active_idx')
      .on(t.code)
      .where(sql`${t.deletedAt} IS NULL`),
    index('outlets_city_province_idx').on(t.city, t.province),
    index('outlets_serves_online_idx').on(t.servesOnline, t.isActive),
    // hanya boleh ada SATU outlet default online
    uniqueIndex('outlets_one_online_default_idx')
      .on(t.isOnlineDefault)
      .where(sql`${t.isOnlineDefault} = true`),
  ]
);

/**
 * outlet_inventory — stok per (outlet, variant). Menggantikan stok global di
 * product_variants. `reservedStock` = stok yang sedang ditahan order PENDING
 * (reservasi 2 fase); available = stock - reservedStock.
 *
 * Mutasi stok WAJIB lewat UPDATE atomic bersyarat (lihat OutletsRepository)
 * agar bebas overselling; CHECK constraint menjadi pagar terakhir.
 */
export const outletInventory = pgTable(
  'outlet_inventory',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    outletId: bigint('outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'cascade' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    stock: integer('stock').notNull().default(0),
    reservedStock: integer('reserved_stock').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('outlet_inventory_outlet_variant_idx').on(
      t.outletId,
      t.variantId
    ),
    index('outlet_inventory_variant_id_idx').on(t.variantId),
    check('outlet_inventory_stock_nonneg', sql`${t.stock} >= 0`),
    check('outlet_inventory_reserved_nonneg', sql`${t.reservedStock} >= 0`),
    check(
      'outlet_inventory_reserved_lte_stock',
      sql`${t.reservedStock} <= ${t.stock}`
    ),
  ]
);

// outlets
export type InsertOutlet = typeof outlets.$inferInsert;
export type SelectOutlet = typeof outlets.$inferSelect;

// outlet_inventory
export type InsertOutletInventory = typeof outletInventory.$inferInsert;
export type SelectOutletInventory = typeof outletInventory.$inferSelect;
