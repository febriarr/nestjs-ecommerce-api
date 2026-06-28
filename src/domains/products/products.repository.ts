import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  sql,
} from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  attributes,
  attributeValues,
  brands,
  categories,
  InsertProduct,
  InsertProductAttribute,
  InsertProductMedia,
  productAttributes,
  productMedia,
  productVariants,
  products,
  ProductStatus,
  SelectAttributeValues,
  SelectProduct,
  SelectProductAttribute,
  SelectProductMedia,
} from '../../infrastructure/database/schema';

export interface ProductListFilter {
  status?: ProductStatus;
  categoryId?: string;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

@Injectable()
export class ProductsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- products ----------

  async findById(id: number): Promise<SelectProduct | null> {
    const product = await this.db.query.products.findFirst({
      where: and(isNull(products.deletedAt), eq(products.id, id)),
    });
    return product ?? null;
  }

  async findBySlug(slug: string): Promise<SelectProduct | null> {
    const product = await this.db.query.products.findFirst({
      where: and(isNull(products.deletedAt), eq(products.slug, slug)),
    });
    return product ?? null;
  }

  /** Keyset pagination (tanpa count): ambil limit + 1 baris, urut id desc. */
  async list(
    filter: ProductListFilter,
    cursorId: number | null,
    limit: number
  ): Promise<SelectProduct[]> {
    const conditions = [isNull(products.deletedAt)];
    if (filter.status) conditions.push(eq(products.status, filter.status));
    if (filter.categoryId)
      conditions.push(eq(products.categoryId, filter.categoryId));
    if (filter.brandId !== undefined)
      conditions.push(eq(products.brandId, filter.brandId));
    if (filter.minPrice !== undefined)
      conditions.push(gte(products.minPrice, filter.minPrice));
    if (filter.maxPrice !== undefined)
      conditions.push(lte(products.minPrice, filter.maxPrice));
    if (filter.search)
      conditions.push(ilike(products.name, `%${filter.search}%`));
    if (cursorId !== null) conditions.push(lt(products.id, cursorId));

    return this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.id))
      .limit(limit + 1);
  }

  async insert(payload: InsertProduct): Promise<SelectProduct> {
    const [product] = await this.db
      .insert(products)
      .values(payload)
      .returning();
    return product;
  }

  async update(
    id: number,
    payload: Partial<InsertProduct>
  ): Promise<SelectProduct> {
    const [product] = await this.db
      .update(products)
      .set(payload)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id));
  }

  /** Recompute cache minPrice = harga variant aktif termurah (null bila tak ada). */
  async recomputeMinPrice(productId: number): Promise<void> {
    await this.db
      .update(products)
      .set({
        minPrice: sql`(select min(${productVariants.price}) from ${productVariants} where ${productVariants.productId} = ${productId} and ${productVariants.status} = 'active' and ${productVariants.deletedAt} is null)`,
      })
      .where(eq(products.id, productId));
  }

  // ---------- existence checks (lintas-entity, self-contained) ----------

  async categoryExists(id: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(and(isNull(categories.deletedAt), eq(categories.id, id)))
      .limit(1);
    return rows.length > 0;
  }

  async brandExists(id: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: brands.id })
      .from(brands)
      .where(and(isNull(brands.deletedAt), eq(brands.id, id)))
      .limit(1);
    return rows.length > 0;
  }

  async attributeExists(id: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: attributes.id })
      .from(attributes)
      .where(and(isNull(attributes.deletedAt), eq(attributes.id, id)))
      .limit(1);
    return rows.length > 0;
  }

  async brandNameById(id: number): Promise<string | null> {
    const rows = await this.db
      .select({ name: brands.name })
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);
    return rows[0]?.name ?? null;
  }

  /** Ambil attribute_values berdasarkan daftar id (untuk validasi + derive attributeId). */
  async attributeValuesByIds(ids: number[]): Promise<SelectAttributeValues[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(attributeValues)
      .where(
        and(isNull(attributeValues.deletedAt), inArray(attributeValues.id, ids))
      );
  }

  // ---------- product_attributes ----------

  async listAttributes(productId: number): Promise<SelectProductAttribute[]> {
    return this.db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId));
  }

  async findAttribute(
    productId: number,
    attributeId: number
  ): Promise<SelectProductAttribute | null> {
    const rows = await this.db
      .select()
      .from(productAttributes)
      .where(
        and(
          eq(productAttributes.productId, productId),
          eq(productAttributes.attributeId, attributeId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async insertAttribute(
    payload: InsertProductAttribute
  ): Promise<SelectProductAttribute> {
    const [row] = await this.db
      .insert(productAttributes)
      .values(payload)
      .returning();
    return row;
  }

  async deleteAttribute(productId: number, attributeId: number): Promise<void> {
    await this.db
      .delete(productAttributes)
      .where(
        and(
          eq(productAttributes.productId, productId),
          eq(productAttributes.attributeId, attributeId)
        )
      );
  }

  // ---------- product_media ----------

  async listMedia(productId: number): Promise<SelectProductMedia[]> {
    return this.db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(productMedia.sortOrder);
  }

  /** Ambil pasangan {id, key} media untuk resolusi URL massal (hindari N+1). */
  async mediaKeysByIds(
    ids: number[]
  ): Promise<{ id: number; imageKey: string }[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({ id: productMedia.id, imageKey: productMedia.imageUrl })
      .from(productMedia)
      .where(inArray(productMedia.id, ids));
    return rows;
  }

  async findMediaById(id: number): Promise<SelectProductMedia | null> {
    const rows = await this.db
      .select()
      .from(productMedia)
      .where(eq(productMedia.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async insertMedia(payload: InsertProductMedia): Promise<SelectProductMedia> {
    const [row] = await this.db
      .insert(productMedia)
      .values(payload)
      .returning();
    return row;
  }

  async updateMediaSort(id: number, sortOrder: number): Promise<void> {
    await this.db
      .update(productMedia)
      .set({ sortOrder })
      .where(eq(productMedia.id, id));
  }

  async deleteMedia(id: number): Promise<void> {
    await this.db.delete(productMedia).where(eq(productMedia.id, id));
  }
}
