import {
  pgEnum,
  varchar,
  bigserial,
  bigint,
  integer,
  boolean,
  pgTable,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { timestamps } from './utils';

export const attributeTypeEnum = pgEnum('attribute_type', [
  'color',
  'text',
  'number',
]);

export type AttributeType = (typeof attributeTypeEnum.enumValues)[number];

/**
 * Attribute untuk digunakan di product dan product variant attribute
 * karena tiap product atau variant memiliki attribute yang berbeda
 */

export const attributes = pgTable(
  'attributes',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    type: attributeTypeEnum('type').default('text').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('attributes_name_idx').on(t.name)]
);

/**
 * attribute values (dynamic attribute values untuk masing-masing product variant)
 */

export const attributeValues = pgTable(
  'attributes_valuse',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    attributeId: bigint('attribute_id', { mode: 'number' })
      .notNull()
      .references(() => attributes.id, { onDelete: 'cascade' }),
    value: varchar('value', { length: 100 }).notNull(),
    displayValue: varchar('display_value', { length: 100 }),
    colorHex: varchar('color_hex', { length: 7 }), // for color attribute
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index('attribute_values_attribute_id_idx').on(t.attributeId),
    uniqueIndex('attribute_values_unique_idx').on(t.attributeId, t.value),
  ]
);

// atributes
export type InserAttribute = typeof attributes.$inferInsert;
export type SelectAttribute = typeof attributes.$inferSelect;

// attribute values
export type InsertAttributeValues = typeof attributeValues.$inferInsert;
export type SelectAttributeValuse = typeof attributeValues.$inferSelect;
