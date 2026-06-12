import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  bigint,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';
import { orders } from './orders.entity';

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
]);
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

/**
 * payments — attempt pembayaran sebuah order lewat PaymentGateway
 * (provider-agnostic). Satu order boleh punya beberapa attempt (retry setelah
 * FAILED), tapi maksimal SATU yang PENDING (partial unique index).
 *
 * Webhook sukses → payment SUCCEEDED → order PAID → finalisasi stok outlet →
 * invoice PAID (pipeline PDF + email berjalan otomatis).
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    /** Id transaksi di sisi provider (null untuk provider manual/dummy). */
    externalId: varchar('external_id', { length: 100 }),
    /** Kode bayar yang ditampilkan ke user (VA number, kode dummy, dll.). */
    paymentCode: varchar('payment_code', { length: 100 }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    status: paymentStatusEnum('status').default('PENDING').notNull(),
    paidAt: timestamp('paid_at', { mode: 'date', withTimezone: true }),
    failureReason: varchar('failure_reason', { length: 512 }),
    ...timestamps,
  },
  (t) => [
    index('payments_order_id_idx').on(t.orderId),
    index('payments_external_id_idx').on(t.externalId),
    // maksimal satu attempt PENDING per order
    uniqueIndex('payments_one_pending_per_order_idx')
      .on(t.orderId)
      .where(sql`${t.status} = 'PENDING'`),
  ]
);

export type InsertPayment = typeof payments.$inferInsert;
export type SelectPayment = typeof payments.$inferSelect;
