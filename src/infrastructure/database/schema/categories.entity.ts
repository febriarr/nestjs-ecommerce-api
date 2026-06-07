import {
  pgTable,
  index,
  AnyPgColumn,
  uuid,
  varchar,
  uniqueIndex,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { timestamps } from './utils';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: varchar('description', { length: 255 }),
    imageUrl: varchar('image_url', { length: 255 }),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('categories_name_idx').on(t.name),
    uniqueIndex('categories_slug_idx').on(t.slug),
    index('categories_parent_id_idx').on(t.parentId),
  ]
);

export type InsertCategories = typeof categories.$inferInsert;
export type SelectCategories = typeof categories.$inferSelect;
