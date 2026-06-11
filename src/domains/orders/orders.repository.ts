import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DatabaseTransaction } from '../../infrastructure/database/database.types';
import {
  InsertOrder,
  InsertOrderItem,
  OrderStatus,
  ProductStatus,
  SelectOrder,
  SelectOrderItem,
  VariantStatus,
  orderItems,
  orders,
  outlets,
  productVariants,
  products,
  userContacts,
  users,
} from '../../infrastructure/database/schema';

/** Identitas + harga live variant untuk membentuk snapshot order_items. */
export interface VariantPricingView {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  price: number;
  variantStatus: VariantStatus;
  productStatus: ProductStatus;
}

export type SelectUserContact = typeof userContacts.$inferSelect;

export interface CustomerView {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class OrdersRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- orders ----------

  async findById(id: string): Promise<SelectOrder | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(isNull(orders.deletedAt), eq(orders.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination (uuidv7 time-ordered), urut terbaru dulu. */
  async listByUser(
    userId: string,
    status: OrderStatus | undefined,
    cursorId: string | null,
    limit: number
  ): Promise<SelectOrder[]> {
    const conditions = [isNull(orders.deletedAt), eq(orders.userId, userId)];
    if (status) conditions.push(eq(orders.status, status));
    if (cursorId !== null) conditions.push(lt(orders.id, cursorId));

    return this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.id))
      .limit(limit + 1);
  }

  async insertOrder(
    tx: DatabaseTransaction,
    payload: InsertOrder
  ): Promise<SelectOrder> {
    const [order] = await tx.insert(orders).values(payload).returning();
    return order;
  }

  async insertOrderItems(
    tx: DatabaseTransaction,
    payloads: InsertOrderItem[]
  ): Promise<void> {
    if (payloads.length === 0) return;
    await tx.insert(orderItems).values(payloads);
  }

  /**
   * Update status secara KONDISIONAL (hanya bila status saat ini = `from`) —
   * atomic guard terhadap race webhook pembayaran vs job expire.
   * Mengembalikan null bila status sudah berubah.
   */
  async updateStatusIf(
    tx: DatabaseTransaction,
    id: string,
    from: OrderStatus,
    patch: Partial<InsertOrder>
  ): Promise<SelectOrder | null> {
    const rows = await tx
      .update(orders)
      .set(patch)
      .where(and(eq(orders.id, id), eq(orders.status, from)))
      .returning();
    return rows[0] ?? null;
  }

  async linkInvoice(id: string, invoiceId: string): Promise<void> {
    await this.db.update(orders).set({ invoiceId }).where(eq(orders.id, id));
  }

  async listItems(orderId: string): Promise<SelectOrderItem[]> {
    return this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(orderItems.id);
  }

  async outletNameById(outletId: number): Promise<string | null> {
    const rows = await this.db
      .select({ name: outlets.name })
      .from(outlets)
      .where(eq(outlets.id, outletId))
      .limit(1);
    return rows[0]?.name ?? null;
  }

  // ---------- lintas-entity (self-contained, pola ProductsRepository) ----------

  async customerById(userId: string): Promise<CustomerView | null> {
    const rows = await this.db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.id, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Kontak alamat kirim milik user (aktif, belum dihapus). */
  async contactById(
    contactId: string,
    userId: string
  ): Promise<SelectUserContact | null> {
    const rows = await this.db
      .select()
      .from(userContacts)
      .where(
        and(
          isNull(userContacts.deletedAt),
          eq(userContacts.id, contactId),
          eq(userContacts.userId, userId),
          eq(userContacts.isActive, true)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Variant hidup + product hidup untuk pricing & snapshot checkout. */
  async variantsByIds(variantIds: number[]): Promise<VariantPricingView[]> {
    if (variantIds.length === 0) return [];
    return this.db
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.variantName,
        skuCode: productVariants.skuCode,
        price: productVariants.price,
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
          inArray(productVariants.id, variantIds)
        )
      );
  }
}
