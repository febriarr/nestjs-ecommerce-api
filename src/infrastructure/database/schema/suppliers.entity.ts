import {
  pgTable,
  bigserial,
  varchar,
  text,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';

/** suppliers — master pemasok untuk purchase order. */
export const suppliers = pgTable(
  'suppliers',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    /** Kode unik internal pemasok (mis. "SUP-ACME"). */
    code: varchar('code', { length: 30 }).notNull().unique(),
    contactName: varchar('contact_name', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('suppliers_code_idx').on(t.code)]
);

export type InsertSupplier = typeof suppliers.$inferInsert;
export type SelectSupplier = typeof suppliers.$inferSelect;
