import { relations } from 'drizzle-orm';
import { brands } from './brands.entity';
import { products } from './products.entity';

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));
