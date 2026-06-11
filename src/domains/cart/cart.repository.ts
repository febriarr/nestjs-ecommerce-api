import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  ProductStatus,
  SelectCart,
  SelectProductDiscount,
  VariantStatus,
  cartItems,
  carts,
  productDiscounts,
  productVariants,
  products,
  users,
} from '../../infrastructure/database/schema';

/** Item cart + identitas & harga live variant (join, tanpa snapshot). */
export interface CartItemView {
  id: number;
  variantId: number;
  quantity: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  price: number;
  variantStatus: VariantStatus;
  productStatus: ProductStatus;
}

@Injectable()
export class CartRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async userExists(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.id, userId)))
      .limit(1);
    return rows.length > 0;
  }

  async findByUser(userId: string): Promise<SelectCart | null> {
    const rows = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Ambil cart user; buat bila belum ada (idempotent terhadap race). */
  async getOrCreate(userId: string): Promise<SelectCart> {
    const existing = await this.findByUser(userId);
    if (existing) return existing;

    const inserted = await this.db
      .insert(carts)
      .values({ userId })
      .onConflictDoNothing({ target: carts.userId })
      .returning();
    if (inserted.length > 0) return inserted[0];

    // Race dengan request lain: baris sudah dibuat — ambil ulang.
    const cart = await this.findByUser(userId);
    if (!cart) throw new Error(`Cart untuk user ${userId} gagal dibuat`);
    return cart;
  }

  async setOutlet(cartId: string, outletId: number): Promise<SelectCart> {
    const [cart] = await this.db
      .update(carts)
      .set({ outletId })
      .where(eq(carts.id, cartId))
      .returning();
    return cart;
  }

  // ---------- items ----------

  /** Item cart yang variant & product-nya masih hidup (soft-delete disaring). */
  async listItems(cartId: string): Promise<CartItemView[]> {
    return this.db
      .select({
        id: cartItems.id,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.variantName,
        skuCode: productVariants.skuCode,
        price: productVariants.price,
        variantStatus: productVariants.status,
        productStatus: products.status,
      })
      .from(cartItems)
      .innerJoin(
        productVariants,
        and(
          eq(cartItems.variantId, productVariants.id),
          isNull(productVariants.deletedAt)
        )
      )
      .innerJoin(
        products,
        and(
          eq(productVariants.productId, products.id),
          isNull(products.deletedAt)
        )
      )
      .where(eq(cartItems.cartId, cartId))
      .orderBy(cartItems.id);
  }

  /** Tambah item; bila sudah ada, qty diakumulasi (upsert atomic). */
  async upsertItem(
    cartId: string,
    variantId: number,
    quantity: number
  ): Promise<void> {
    await this.db
      .insert(cartItems)
      .values({ cartId, variantId, quantity })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId],
        set: {
          quantity: sql`${cartItems.quantity} + ${quantity}`,
          updatedAt: new Date(),
        },
      });
  }

  /** Set qty absolut; false bila item tidak ada. */
  async updateItemQuantity(
    cartId: string,
    variantId: number,
    quantity: number
  ): Promise<boolean> {
    const rows = await this.db
      .update(cartItems)
      .set({ quantity })
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId))
      )
      .returning({ id: cartItems.id });
    return rows.length > 0;
  }

  /** Hapus item; false bila item tidak ada. */
  async deleteItem(cartId: string, variantId: number): Promise<boolean> {
    const rows = await this.db
      .delete(cartItems)
      .where(
        and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId))
      )
      .returning({ id: cartItems.id });
    return rows.length > 0;
  }

  async clearItems(cartId: string): Promise<void> {
    await this.db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  }

  // ---------- pricing (lintas-entity, self-contained) ----------

  /** Variant hidup + product hidup untuk validasi penambahan item. */
  async findPurchasableVariant(variantId: number): Promise<{
    variantStatus: VariantStatus;
    productStatus: ProductStatus;
  } | null> {
    const rows = await this.db
      .select({
        variantStatus: productVariants.status,
        productStatus: products.status,
      })
      .from(productVariants)
      .innerJoin(
        products,
        and(
          eq(productVariants.productId, products.id),
          isNull(products.deletedAt)
        )
      )
      .where(
        and(
          isNull(productVariants.deletedAt),
          eq(productVariants.id, variantId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Diskon aktif seluruh product terkait, prioritas tertinggi dulu. */
  async activeDiscountsByProductIds(
    productIds: number[],
    now: Date
  ): Promise<SelectProductDiscount[]> {
    if (productIds.length === 0) return [];
    return this.db
      .select()
      .from(productDiscounts)
      .where(
        and(
          inArray(productDiscounts.productId, productIds),
          eq(productDiscounts.isActive, true),
          lte(productDiscounts.startAt, now),
          gte(productDiscounts.endAt, now)
        )
      )
      .orderBy(desc(productDiscounts.priority));
  }
}
