import { relations } from 'drizzle-orm';
import { categories } from './categories.entity';
import { products } from './products.entity';

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  products: many(products),
  // Relasi ke anak-anaknya
  subCategories: many(categories, { relationName: 'sub_categories' }),
  // Relasi ke induknya
  parentCategory: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'sub_categories',
  }),
}));
