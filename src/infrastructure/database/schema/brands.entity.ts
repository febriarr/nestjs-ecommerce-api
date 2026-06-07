import {
  pgTable,
  bigserial,
  varchar,
  index,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';

export const brands = pgTable(
  'brands',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    logo: varchar('logo', { length: 255 }),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index('brands_name_idx').on(t.name),
    uniqueIndex('brands_slug_idx').on(t.slug),
  ]
);

export type InsertBrands = typeof brands.$inferInsert;
export type SelectBrands = typeof brands.$inferSelect;
