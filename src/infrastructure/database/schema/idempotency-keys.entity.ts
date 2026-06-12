import {
  pgTable,
  bigserial,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users.entity';
import { orders } from './orders.entity';

/**
 * idempotency_keys — kunci idempotensi per user untuk operasi non-idempoten
 * (saat ini: checkout). Klaim dilakukan INSERT ON CONFLICT DO NOTHING:
 * baris dengan `orderId` null berarti request masih diproses (in-flight);
 * baris ber-`orderId` berarti replay → kembalikan order yang sama.
 * Baris dihapus bila proses gagal, sehingga retry dengan key sama bisa jalan.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Lingkup operasi (mis. 'checkout') — key unik per user per scope. */
    scope: varchar('scope', { length: 30 }).notNull(),
    key: varchar('key', { length: 100 }).notNull(),
    /** Hasil operasi; null = masih diproses. */
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('idempotency_keys_user_scope_key_idx').on(
      t.userId,
      t.scope,
      t.key
    ),
  ]
);

export type InsertIdempotencyKey = typeof idempotencyKeys.$inferInsert;
export type SelectIdempotencyKey = typeof idempotencyKeys.$inferSelect;
