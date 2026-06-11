import { sql } from 'drizzle-orm';
import {
  pgTable,
  bigserial,
  bigint,
  uuid,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './users.entity';
import { outlets } from './outlets.entity';
import { productVariants } from './product-variants.entity';

/**
 * carts — satu cart aktif per user, TERIKAT ke satu outlet terpilih.
 * `outletId` null = user belum memilih outlet (item boleh ditambah, tapi
 * validasi stok & checkout membutuhkan outlet). Cart tidak di-soft-delete;
 * isinya di-clear setelah checkout.
 */
export const carts = pgTable(
  'carts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    outletId: bigint('outlet_id', { mode: 'number' }).references(
      () => outlets.id,
      { onDelete: 'set null' }
    ),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [index('carts_outlet_id_idx').on(t.outletId)]
);

/**
 * cart_items — item = variant + qty. Harga TIDAK disimpan di sini: selalu
 * dihitung live dari variant + diskon aktif; snapshot harga baru terjadi
 * saat checkout (order_items).
 */
export const cartItems = pgTable(
  'cart_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('cart_items_cart_variant_idx').on(t.cartId, t.variantId),
    index('cart_items_variant_id_idx').on(t.variantId),
    check('cart_items_quantity_positive', sql`${t.quantity} > 0`),
  ]
);

// carts
export type InsertCart = typeof carts.$inferInsert;
export type SelectCart = typeof carts.$inferSelect;

// cart_items
export type InsertCartItem = typeof cartItems.$inferInsert;
export type SelectCartItem = typeof cartItems.$inferSelect;
