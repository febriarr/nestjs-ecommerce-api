import { relations } from 'drizzle-orm';
import { attributes, attributeValues } from './attributes.entity';
import { productAttributes } from './products.entity';
import { variantAttributes } from './product-variants.entity';

export const attributesRelations = relations(attributes, ({ many }) => ({
  values: many(attributeValues),
  productAttributes: many(productAttributes),
  variantAttributes: many(variantAttributes),
}));

export const attributeValuesRelations = relations(
  attributeValues,
  ({ one, many }) => ({
    attribute: one(attributes, {
      fields: [attributeValues.attributeId],
      references: [attributes.id],
    }),
    variantAttributes: many(variantAttributes),
  })
);
