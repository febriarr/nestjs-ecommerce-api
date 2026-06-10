import {
  pgTable,
  uuid,
  varchar,
  bigint,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';

/**
 * Snapshot satu baris item invoice.
 *
 * Item disimpan sebagai snapshot (JSONB) — bukan FK live — karena harga &
 * deskripsi pada invoice harus imutabel terhadap perubahan data sumber.
 * Seluruh nominal dalam satuan Rupiah penuh (tanpa desimal).
 */
export interface InvoiceItemSnapshot {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Status pembayaran invoice. Mendukung transaksi online maupun offline
 * (grosir/vendor): pembayaran bertahap (DP/cicilan), jatuh tempo, pembatalan.
 */
export const INVOICE_PAYMENT_STATUSES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
] as const;
export type InvoicePaymentStatus = (typeof INVOICE_PAYMENT_STATUSES)[number];
/** Status pipeline pembuatan PDF (queue). */
export type InvoicePdfStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
/** Status pengiriman email invoice (queue). */
export type InvoiceEmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
    issueDate: timestamp('issue_date', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    customerName: varchar('customer_name', { length: 150 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    items: jsonb('items').$type<InvoiceItemSnapshot[]>().notNull(),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    total: bigint('total', { mode: 'number' }).notNull(),
    status: varchar('status', { length: 20 })
      .$type<InvoicePaymentStatus>()
      .default('UNPAID')
      .notNull(),
    /** Akumulasi nominal yang sudah dibayar (Rupiah penuh). */
    amountPaid: bigint('amount_paid', { mode: 'number' }).default(0).notNull(),
    /** Tanggal jatuh tempo (untuk OVERDUE / tagihan vendor net-N). */
    dueDate: timestamp('due_date', { mode: 'date', withTimezone: true }),
    paidAt: timestamp('paid_at', { mode: 'date', withTimezone: true }),
    pdfKey: varchar('pdf_key', { length: 512 }),
    pdfStatus: varchar('pdf_status', { length: 20 })
      .$type<InvoicePdfStatus>()
      .default('PENDING')
      .notNull(),
    emailStatus: varchar('email_status', { length: 20 })
      .$type<InvoiceEmailStatus>()
      .default('PENDING')
      .notNull(),
    sentAt: timestamp('sent_at', { mode: 'date', withTimezone: true }),
    failureReason: varchar('failure_reason', { length: 512 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_invoice_number_idx').on(t.invoiceNumber),
    index('invoices_customer_email_idx').on(t.customerEmail),
  ]
);

export type InsertInvoices = typeof invoices.$inferInsert;
export type SelectInvoices = typeof invoices.$inferSelect;
