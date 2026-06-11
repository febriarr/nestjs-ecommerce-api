import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  bigserial,
  bigint,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';
import { suppliers } from './suppliers.entity';
import { outlets } from './outlets.entity';
import { productVariants } from './product-variants.entity';
import { users } from './users.entity';

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT',
  'ORDERED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);
export type PurchaseOrderStatus =
  (typeof purchaseOrderStatusEnum.enumValues)[number];

/**
 * purchase_orders — pesanan pembelian ke supplier, satu PO = satu outlet
 * tujuan penerimaan (konsisten dengan "satu order = satu outlet").
 *
 * Siklus: DRAFT (item bebas diubah) → ORDERED (terkunci) →
 * PARTIALLY_RECEIVED/RECEIVED (otomatis dari progres penerimaan, bukan
 * di-set manual) | CANCELLED (hanya selama belum ada penerimaan).
 */
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
    supplierId: bigint('supplier_id', { mode: 'number' })
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    /** Outlet tujuan penerimaan barang. */
    outletId: bigint('outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    status: purchaseOrderStatusEnum('status').default('DRAFT').notNull(),
    /** Estimasi tanggal barang datang (informasional). */
    expectedAt: timestamp('expected_at', { mode: 'date', withTimezone: true }),
    notes: varchar('notes', { length: 500 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('purchase_orders_po_number_idx').on(t.poNumber),
    index('purchase_orders_supplier_id_idx').on(t.supplierId),
    index('purchase_orders_outlet_id_idx').on(t.outletId),
    index('purchase_orders_status_idx').on(t.status),
  ]
);

/**
 * purchase_order_items — satu baris per variant per PO. `qtyReceived` adalah
 * cache progres penerimaan (boleh MELEBIHI qtyOrdered — kebijakan over-receipt
 * diizinkan; kelebihannya ditandai overReceived di goods_receipt_items).
 */
export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    poId: uuid('po_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    qtyOrdered: integer('qty_ordered').notNull(),
    /** Harga beli satuan (Rupiah penuh) — dasar laporan COGS/valuasi kelak. */
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull(),
    qtyReceived: integer('qty_received').default(0).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    uniqueIndex('purchase_order_items_po_variant_idx').on(t.poId, t.variantId),
    index('purchase_order_items_variant_id_idx').on(t.variantId),
    check('purchase_order_items_qty_positive', sql`${t.qtyOrdered} > 0`),
    check('purchase_order_items_cost_nonneg', sql`${t.unitCost} >= 0`),
    check('purchase_order_items_received_nonneg', sql`${t.qtyReceived} >= 0`),
  ]
);

/**
 * goods_receipts (GRN) — dokumen penerimaan barang terhadap sebuah PO.
 * Satu PO boleh punya banyak GRN (penerimaan parsial).
 */
export const goodsReceipts = pgTable(
  'goods_receipts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
    poId: uuid('po_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'restrict' }),
    /** Denormalisasi dari PO — outlet penerima. */
    outletId: bigint('outlet_id', { mode: 'number' })
      .notNull()
      .references(() => outlets.id, { onDelete: 'restrict' }),
    receivedBy: uuid('received_by')
      .notNull()
      .references(() => users.id),
    notes: varchar('notes', { length: 500 }),
    receivedAt: timestamp('received_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('goods_receipts_receipt_number_idx').on(t.receiptNumber),
    index('goods_receipts_po_id_idx').on(t.poId),
  ]
);

/**
 * goods_receipt_items — qty yang diterima per item PO pada satu GRN.
 * `overReceived` = qty penerimaan ini melebihi sisa pesanan saat diterima
 * (diizinkan; flag untuk laporan pembelian).
 */
export const goodsReceiptItems = pgTable(
  'goods_receipt_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    receiptId: uuid('receipt_id')
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: 'cascade' }),
    poItemId: bigint('po_item_id', { mode: 'number' })
      .notNull()
      .references(() => purchaseOrderItems.id, { onDelete: 'restrict' }),
    variantId: bigint('variant_id', { mode: 'number' })
      .notNull()
      .references(() => productVariants.id, { onDelete: 'restrict' }),
    qtyReceived: integer('qty_received').notNull(),
    /** Snapshot harga beli dari PO item saat penerimaan. */
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull(),
    overReceived: boolean('over_received').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('goods_receipt_items_receipt_id_idx').on(t.receiptId),
    index('goods_receipt_items_po_item_id_idx').on(t.poItemId),
    check('goods_receipt_items_qty_positive', sql`${t.qtyReceived} > 0`),
  ]
);

// purchase_orders
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type SelectPurchaseOrder = typeof purchaseOrders.$inferSelect;

// purchase_order_items
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type SelectPurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;

// goods_receipts
export type InsertGoodsReceipt = typeof goodsReceipts.$inferInsert;
export type SelectGoodsReceipt = typeof goodsReceipts.$inferSelect;

// goods_receipt_items
export type InsertGoodsReceiptItem = typeof goodsReceiptItems.$inferInsert;
export type SelectGoodsReceiptItem = typeof goodsReceiptItems.$inferSelect;
