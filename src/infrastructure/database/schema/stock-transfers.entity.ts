import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';
import { outlets } from './outlets.entity';
import { productVariants } from './product-variants.entity';
import { users } from './users.entity';

export const stockTransferStatusEnum = pgEnum('stock_transfer_status', [
  'DRAFT',
  'SENT',
  'RECEIVED',
  'CANCELLED',
]);
export type StockTransferStatus =
  (typeof stockTransferStatusEnum.enumValues)[number];

/**
 * stock_transfers — pemindahan stok antar outlet (satu bisnis).
 *
 * Siklus: DRAFT (item bebas diubah) → SENT (stok keluar dari outlet asal +
 * ledger TRANSFER_OUT) → RECEIVED (stok masuk ke outlet tujuan + ledger
 * TRANSFER_IN) | CANCELLED (hanya dari DRAFT). Selama SENT, barang "in
 * transit" — tidak tercatat di outlet mana pun (jejaknya ada di ledger).
 */
export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    transferNumber: varchar('transfer_number', { length: 50 })
      .notNull()
      .unique(),
    fromOutletId: bigint('from_outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    toOutletId: bigint('to_outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    status: stockTransferStatusEnum('status').default('DRAFT').notNull(),
    notes: varchar('notes', { length: 500 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    sentAt: timestamp('sent_at', { mode: 'date', withTimezone: true }),
    receivedAt: timestamp('received_at', { mode: 'date', withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('stock_transfers_number_idx').on(t.transferNumber),
    index('stock_transfers_from_outlet_idx').on(t.fromOutletId),
    index('stock_transfers_to_outlet_idx').on(t.toOutletId),
    index('stock_transfers_status_idx').on(t.status),
    check(
      'stock_transfers_distinct_outlets',
      sql`${t.fromOutletId} <> ${t.toOutletId}`
    ),
  ]
);

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    transferId: uuid('transfer_id')
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('stock_transfer_items_transfer_variant_idx').on(
      t.transferId,
      t.variantId
    ),
    index('stock_transfer_items_variant_id_idx').on(t.variantId),
    check('stock_transfer_items_qty_positive', sql`${t.quantity} > 0`),
  ]
);

// stock_transfers
export type InsertStockTransfer = typeof stockTransfers.$inferInsert;
export type SelectStockTransfer = typeof stockTransfers.$inferSelect;

// stock_transfer_items
export type InsertStockTransferItem = typeof stockTransferItems.$inferInsert;
export type SelectStockTransferItem = typeof stockTransferItems.$inferSelect;
