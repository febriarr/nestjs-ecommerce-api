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
    pdfKey: varchar('pdf_key', { length: 512 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('invoices_invoice_number_idx').on(t.invoiceNumber),
    index('invoices_customer_email_idx').on(t.customerEmail),
  ]
);

export type InsertInvoices = typeof invoices.$inferInsert;
export type SelectInvoices = typeof invoices.$inferSelect;
