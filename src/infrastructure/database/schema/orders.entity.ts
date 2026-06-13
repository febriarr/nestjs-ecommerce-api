import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';
import { users } from './users.entity';
import { outlets } from './outlets.entity';
import { invoices } from './invoices.entity';
import { products } from './products.entity';
import { productVariants } from './product-variants.entity';

export const orderChannelEnum = pgEnum('order_channel', ['ONLINE', 'OFFLINE']);
export type OrderChannel = (typeof orderChannelEnum.enumValues)[number];

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'PAID',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
]);
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

/**
 * Snapshot alamat kirim dari user_contacts saat checkout — imutabel terhadap
 * perubahan/penghapusan kontak setelahnya. Koordinat disimpan sebagai string
 * (mengikuti tipe decimal user_contacts).
 */
export interface OrderShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  notes: string | null;
  latitude: string | null;
  longitude: string | null;
}

/**
 * orders — satu order = SATU outlet (kebijakan A: bila tidak ada outlet yang
 * sanggup memenuhi semua item, checkout ditolak dan user menyesuaikan).
 *
 * Seluruh nominal Rupiah penuh. total = subtotal - discountTotal + shippingFee.
 * `expiresAt` = batas waktu pembayaran; lewat itu reservasi stok dilepas
 * (job EXPIRE di order queue) dan status menjadi EXPIRED.
 */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    // Nullable: order OFFLINE (POS) walk-in tidak selalu punya akun member.
    // Order ONLINE selalu terisi (dari sesi); walk-in tanpa member = null.
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    outletId: bigint('outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    channel: orderChannelEnum('channel').notNull(),
    status: orderStatusEnum('status').default('PENDING').notNull(),
    /** Invoice terkait (dibuat saat checkout); satu invoice per order. */
    invoiceId: uuid('invoice_id')
      .unique()
      .references(() => invoices.id, { onDelete: 'set null' }),
    /** Snapshot alamat kirim; null untuk order OFFLINE (POS). */
    shippingAddress: jsonb('shipping_address').$type<OrderShippingAddress>(),
    /** Jumlah harga sebelum diskon (price * qty seluruh item). */
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    discountTotal: bigint('discount_total', { mode: 'number' })
      .default(0)
      .notNull(),
    shippingFee: bigint('shipping_fee', { mode: 'number' })
      .default(0)
      .notNull(),
    total: bigint('total', { mode: 'number' }).notNull(),
    /** Batas waktu pembayaran sebelum reservasi stok dilepas. */
    expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }),
    paidAt: timestamp('paid_at', { mode: 'date', withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', {
      mode: 'date',
      withTimezone: true,
    }),
    refundedAt: timestamp('refunded_at', {
      mode: 'date',
      withTimezone: true,
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('orders_order_number_idx').on(t.orderNumber),
    index('orders_user_id_idx').on(t.userId),
    index('orders_outlet_id_idx').on(t.outletId),
    index('orders_status_idx').on(t.status),
    // sweep order PENDING yang lewat batas bayar
    index('orders_status_expires_at_idx').on(t.status, t.expiresAt),
  ]
);

/**
 * order_items — snapshot item saat checkout (nama, SKU, harga setelah diskon).
 * FK variant/product memakai onDelete restrict: keduanya soft-delete, baris
 * order harus tetap utuh untuk pembukuan.
 */
export const orderItems = pgTable(
  'order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: bigint('product_id', { mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    productName: varchar('product_name', { length: 200 }).notNull(),
    variantName: varchar('variant_name', { length: 200 }),
    skuCode: varchar('sku_code', { length: 100 }).notNull(),
    /** Harga satuan SETELAH diskon (Rupiah penuh). */
    unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
    /** Potongan per satuan yang diterapkan saat checkout. */
    discountAmount: bigint('discount_amount', { mode: 'number' })
      .default(0)
      .notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_variant_id_idx').on(t.variantId),
  ]
);

// orders
export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

// order_items
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;
