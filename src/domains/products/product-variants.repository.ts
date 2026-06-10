import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  attributes,
  attributeValues,
  InsertProductVariant,
  InsertVariantMedia,
  productMedia,
  productVariants,
  SelectProductVariant,
  variantAttributes,
  variantMedia,
} from '../../infrastructure/database/schema';

export interface VariantAttributePair {
  attributeId: number;
  attributeValueId: number;
}

export interface VariantAttributeView {
  attributeId: number;
  attributeName: string;
  attributeValueId: number;
  value: string;
  displayValue: string | null;
}

export interface VariantMediaView {
  mediaId: number;
  imageKey: string;
  imageAlt: string | null;
  sortOrder: number;
}

@Injectable()
export class ProductVariantsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: number): Promise<SelectProductVariant | null> {
    const rows = await this.db
      .select()
      .from(productVariants)
      .where(and(isNull(productVariants.deletedAt), eq(productVariants.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listByProduct(productId: number): Promise<SelectProductVariant[]> {
    return this.db
      .select()
      .from(productVariants)
      .where(
        and(
          isNull(productVariants.deletedAt),
          eq(productVariants.productId, productId)
        )
      )
      .orderBy(productVariants.id);
  }

  async skuCodeExists(skuCode: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.skuCode, skuCode))
      .limit(1);
    return rows.length > 0;
  }

  /**
   * Buat variant + variant_attributes secara atomik. Bila `unsetDefaultFirst`,
   * default lama di-nonaktifkan dulu agar partial unique index tidak bentrok.
   */
  async createVariant(
    payload: InsertProductVariant,
    attributePairs: VariantAttributePair[],
    unsetDefaultFirst: boolean
  ): Promise<SelectProductVariant> {
    return this.withTransaction(async (tx) => {
      if (unsetDefaultFirst) {
        await tx
          .update(productVariants)
          .set({ isDefault: false })
          .where(eq(productVariants.productId, payload.productId));
      }

      const [variant] = await tx
        .insert(productVariants)
        .values(payload)
        .returning();

      if (attributePairs.length > 0) {
        await tx.insert(variantAttributes).values(
          attributePairs.map((pair) => ({
            variantId: variant.id,
            attributeId: pair.attributeId,
            attributeValueId: pair.attributeValueId,
          }))
        );
      }

      return variant;
    });
  }

  async update(
    id: number,
    payload: Partial<InsertProductVariant>,
    unsetDefaultFirst: boolean,
    productId: number
  ): Promise<SelectProductVariant> {
    return this.withTransaction(async (tx) => {
      if (unsetDefaultFirst) {
        await tx
          .update(productVariants)
          .set({ isDefault: false })
          .where(eq(productVariants.productId, productId));
      }
      const [variant] = await tx
        .update(productVariants)
        .set(payload)
        .where(eq(productVariants.id, id))
        .returning();
      return variant;
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(productVariants)
      .set({ deletedAt: new Date() })
      .where(eq(productVariants.id, id));
  }

  async listAttributes(variantId: number): Promise<VariantAttributeView[]> {
    return this.db
      .select({
        attributeId: variantAttributes.attributeId,
        attributeName: attributes.name,
        attributeValueId: variantAttributes.attributeValueId,
        value: attributeValues.value,
        displayValue: attributeValues.displayValue,
      })
      .from(variantAttributes)
      .innerJoin(attributes, eq(variantAttributes.attributeId, attributes.id))
      .innerJoin(
        attributeValues,
        eq(variantAttributes.attributeValueId, attributeValues.id)
      )
      .where(eq(variantAttributes.variantId, variantId));
  }

  // ---------- variant_media ----------

  async findVariantMedia(
    variantId: number,
    mediaId: number
  ): Promise<{ variantId: number; mediaId: number } | null> {
    const rows = await this.db
      .select({
        variantId: variantMedia.variantId,
        mediaId: variantMedia.mediaId,
      })
      .from(variantMedia)
      .where(
        and(
          eq(variantMedia.variantId, variantId),
          eq(variantMedia.mediaId, mediaId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async insertVariantMedia(payload: InsertVariantMedia): Promise<void> {
    await this.db.insert(variantMedia).values(payload);
  }

  async deleteVariantMedia(variantId: number, mediaId: number): Promise<void> {
    await this.db
      .delete(variantMedia)
      .where(
        and(
          eq(variantMedia.variantId, variantId),
          eq(variantMedia.mediaId, mediaId)
        )
      );
  }

  async listVariantMedia(variantId: number): Promise<VariantMediaView[]> {
    return this.db
      .select({
        mediaId: variantMedia.mediaId,
        imageKey: productMedia.imageUrl,
        imageAlt: productMedia.imageAlt,
        sortOrder: variantMedia.sortOrder,
      })
      .from(variantMedia)
      .innerJoin(productMedia, eq(variantMedia.mediaId, productMedia.id))
      .where(eq(variantMedia.variantId, variantId))
      .orderBy(variantMedia.sortOrder);
  }
}
