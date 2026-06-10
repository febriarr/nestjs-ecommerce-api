import { relations } from 'drizzle-orm';
import {
  products,
  productAttributes,
  productMedia,
  productDiscounts,
} from './products.entity';
import {
  productVariants,
  variantAttributes,
  variantMedia,
} from './product-variants.entity';
import { categories } from './categories.entity';
import { brands } from './brands.entity';
import { users } from './users.entity';
import { attributes } from './attributes.entity';
import { attributeValues } from './attributes.entity';

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  createdByUser: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  thumbnailMedia: one(productMedia, {
    fields: [products.thumbnailMediaId],
    references: [productMedia.id],
    relationName: 'product_thumbnail',
  }),
  attributes: many(productAttributes),
  variants: many(productVariants),
  media: many(productMedia, { relationName: 'product_media_items' }),
  discounts: many(productDiscounts),
}));

export const productAttributesRelations = relations(
  productAttributes,
  ({ one }) => ({
    product: one(products, {
      fields: [productAttributes.productId],
      references: [products.id],
    }),
    attribute: one(attributes, {
      fields: [productAttributes.attributeId],
      references: [attributes.id],
    }),
  })
);

export const productMediaRelations = relations(
  productMedia,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productMedia.productId],
      references: [products.id],
      relationName: 'product_media_items',
    }),
    variantMedia: many(variantMedia),
  })
);

export const productDiscountsRelations = relations(
  productDiscounts,
  ({ one }) => ({
    product: one(products, {
      fields: [productDiscounts.productId],
      references: [products.id],
    }),
  })
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    attributes: many(variantAttributes),
    media: many(variantMedia),
  })
);

export const variantAttributesRelations = relations(
  variantAttributes,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [variantAttributes.variantId],
      references: [productVariants.id],
    }),
    attribute: one(attributes, {
      fields: [variantAttributes.attributeId],
      references: [attributes.id],
    }),
    attributeValue: one(attributeValues, {
      fields: [variantAttributes.attributeValueId],
      references: [attributeValues.id],
    }),
  })
);

export const variantMediaRelations = relations(variantMedia, ({ one }) => ({
  variant: one(productVariants, {
    fields: [variantMedia.variantId],
    references: [productVariants.id],
  }),
  media: one(productMedia, {
    fields: [variantMedia.mediaId],
    references: [productMedia.id],
  }),
}));
