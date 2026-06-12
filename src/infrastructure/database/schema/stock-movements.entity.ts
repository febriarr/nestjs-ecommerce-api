import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  integer,
  varchar,
  uuid,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { outlets } from './outlets.entity';
import { productVariants } from './product-variants.entity';
import { users } from './users.entity';

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'PURCHASE_RECEIPT',
  'ADJUSTMENT',
  'SALE',
  'RESERVE',
  'RELEASE',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'REFUND_RESTOCK',
]);
export type StockMovementType =
  (typeof stockMovementTypeEnum.enumValues)[number];

/** Sumber sebuah movement (untuk drill-down dari ledger ke dokumen asal). */
export const STOCK_MOVEMENT_REF_TYPES = [
  'order',
  'goods_receipt',
  'stock_transfer',
] as const;
export type StockMovementRefType = (typeof STOCK_MOVEMENT_REF_TYPES)[number];

/**
 * stock_movements — ledger jejak audit stok, APPEND-ONLY (tidak pernah
 * di-update/di-delete). Setiap mutasi outlet_inventory WAJIB menulis satu
 * baris di sini, dalam TRANSAKSI YANG SAMA (ditegakkan terpusat di
 * OutletsRepository — tidak ada jalur mutasi lain).
 *
 * `stockAfter`/`reservedAfter` = snapshot SETELAH mutasi, sehingga posisi
 * stok kapan pun dapat direkonstruksi dan anomali terdeteksi (baris N+1
 * harus konsisten dengan baris N + perubahan).
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    outletId: bigint('outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    type: stockMovementTypeEnum('type').notNull(),
    /** Perubahan stok fisik, bertanda (mis. +20 penerimaan, -2 penjualan). */
    stockChange: integer('stock_change').default(0).notNull(),
    /** Perubahan reservedStock, bertanda (mis. +2 checkout, -2 release). */
    reservedChange: integer('reserved_change').default(0).notNull(),
    stockAfter: integer('stock_after').notNull(),
    reservedAfter: integer('reserved_after').notNull(),
    refType: varchar('ref_type', { length: 30 }).$type<StockMovementRefType>(),
    refId: varchar('ref_id', { length: 64 }),
    /** Admin pelaku (penerimaan/adjustment/transfer); null untuk mutasi sistem. */
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    note: varchar('note', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // timeline per (outlet, variant) — query utama halaman riwayat
    index('stock_movements_outlet_variant_idx').on(t.outletId, t.variantId),
    index('stock_movements_ref_idx').on(t.refType, t.refId),
    index('stock_movements_type_idx').on(t.type),
  ]
);

export type InsertStockMovement = typeof stockMovements.$inferInsert;
export type SelectStockMovement = typeof stockMovements.$inferSelect;
