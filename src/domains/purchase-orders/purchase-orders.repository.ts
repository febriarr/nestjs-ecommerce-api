import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DatabaseTransaction } from '../../infrastructure/database/database.types';
import {
  InsertGoodsReceipt,
  InsertGoodsReceiptItem,
  InsertPurchaseOrder,
  InsertPurchaseOrderItem,
  PurchaseOrderStatus,
  SelectGoodsReceipt,
  SelectGoodsReceiptItem,
  SelectPurchaseOrder,
  SelectPurchaseOrderItem,
  goodsReceiptItems,
  goodsReceipts,
  productVariants,
  products,
  purchaseOrderItems,
  purchaseOrders,
  users,
} from '../../infrastructure/database/schema';

export interface PoListFilter {
  status?: PurchaseOrderStatus;
  supplierId?: number;
  outletId?: number;
}

/** Item PO + identitas variant untuk response. */
export interface PoItemView {
  id: number;
  variantId: number;
  skuCode: string;
  variantName: string | null;
  productName: string;
  qtyOrdered: number;
  unitCost: number;
  qtyReceived: number;
}

@Injectable()
export class PurchaseOrdersRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- lintas-entity (self-contained) ----------

  async userExists(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), eq(users.id, userId)))
      .limit(1);
    return rows.length > 0;
  }

  // ---------- purchase orders ----------

  async findById(id: string): Promise<SelectPurchaseOrder | null> {
    const rows = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(isNull(purchaseOrders.deletedAt), eq(purchaseOrders.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination (uuidv7 time-ordered), urut terbaru dulu. */
  async list(
    filter: PoListFilter,
    cursorId: string | null,
    limit: number
  ): Promise<SelectPurchaseOrder[]> {
    const conditions = [isNull(purchaseOrders.deletedAt)];
    if (filter.status)
      conditions.push(eq(purchaseOrders.status, filter.status));
    if (filter.supplierId !== undefined)
      conditions.push(eq(purchaseOrders.supplierId, filter.supplierId));
    if (filter.outletId !== undefined)
      conditions.push(eq(purchaseOrders.outletId, filter.outletId));
    if (cursorId !== null) conditions.push(lt(purchaseOrders.id, cursorId));

    return this.db
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.id))
      .limit(limit + 1);
  }

  /** Buat PO + item awal dalam satu transaksi. */
  async createWithItems(
    payload: InsertPurchaseOrder,
    items: Omit<InsertPurchaseOrderItem, 'poId'>[]
  ): Promise<SelectPurchaseOrder> {
    return this.withTransaction(async (tx) => {
      const [po] = await tx.insert(purchaseOrders).values(payload).returning();
      if (items.length > 0) {
        await tx
          .insert(purchaseOrderItems)
          .values(items.map((item) => ({ ...item, poId: po.id })));
      }
      return po;
    });
  }

  async update(
    id: string,
    payload: Partial<InsertPurchaseOrder>
  ): Promise<SelectPurchaseOrder> {
    const [po] = await this.db
      .update(purchaseOrders)
      .set(payload)
      .where(eq(purchaseOrders.id, id))
      .returning();
    return po;
  }

  /**
   * Transisi status kondisional (atomic guard) — null bila status sudah
   * berubah (race submit/cancel/penerimaan).
   */
  async updateStatusIf(
    id: string,
    from: PurchaseOrderStatus,
    patch: Partial<InsertPurchaseOrder>
  ): Promise<SelectPurchaseOrder | null> {
    const rows = await this.db
      .update(purchaseOrders)
      .set(patch)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.status, from)))
      .returning();
    return rows[0] ?? null;
  }

  // ---------- items ----------

  async listItems(poId: string): Promise<PoItemView[]> {
    return this.db
      .select({
        id: purchaseOrderItems.id,
        variantId: purchaseOrderItems.variantId,
        skuCode: productVariants.skuCode,
        variantName: productVariants.variantName,
        productName: products.name,
        qtyOrdered: purchaseOrderItems.qtyOrdered,
        unitCost: purchaseOrderItems.unitCost,
        qtyReceived: purchaseOrderItems.qtyReceived,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        productVariants,
        eq(purchaseOrderItems.variantId, productVariants.id)
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(purchaseOrderItems.poId, poId))
      .orderBy(purchaseOrderItems.id);
  }

  async findItem(
    poId: string,
    itemId: number
  ): Promise<SelectPurchaseOrderItem | null> {
    const rows = await this.db
      .select()
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.poId, poId),
          eq(purchaseOrderItems.id, itemId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async itemVariantExists(poId: string, variantId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: purchaseOrderItems.id })
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.poId, poId),
          eq(purchaseOrderItems.variantId, variantId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async insertItem(
    payload: InsertPurchaseOrderItem
  ): Promise<SelectPurchaseOrderItem> {
    const [item] = await this.db
      .insert(purchaseOrderItems)
      .values(payload)
      .returning();
    return item;
  }

  async updateItem(
    itemId: number,
    payload: Partial<InsertPurchaseOrderItem>
  ): Promise<SelectPurchaseOrderItem> {
    const [item] = await this.db
      .update(purchaseOrderItems)
      .set(payload)
      .where(eq(purchaseOrderItems.id, itemId))
      .returning();
    return item;
  }

  async deleteItem(itemId: number): Promise<void> {
    await this.db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, itemId));
  }

  // ---------- goods receipts ----------

  async hasReceipts(poId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: goodsReceipts.id })
      .from(goodsReceipts)
      .where(eq(goodsReceipts.poId, poId))
      .limit(1);
    return rows.length > 0;
  }

  async listReceipts(poId: string): Promise<SelectGoodsReceipt[]> {
    return this.db
      .select()
      .from(goodsReceipts)
      .where(eq(goodsReceipts.poId, poId))
      .orderBy(desc(goodsReceipts.id));
  }

  async listReceiptItems(receiptId: string): Promise<SelectGoodsReceiptItem[]> {
    return this.db
      .select()
      .from(goodsReceiptItems)
      .where(eq(goodsReceiptItems.receiptId, receiptId))
      .orderBy(goodsReceiptItems.id);
  }

  // ---------- tx-scoped (dipanggil dari transaksi penerimaan) ----------

  async insertPoTx(
    tx: DatabaseTransaction,
    payload: InsertPurchaseOrder
  ): Promise<SelectPurchaseOrder> {
    const [po] = await tx.insert(purchaseOrders).values(payload).returning();
    return po;
  }

  async insertItemsTx(
    tx: DatabaseTransaction,
    payloads: InsertPurchaseOrderItem[]
  ): Promise<SelectPurchaseOrderItem[]> {
    return tx.insert(purchaseOrderItems).values(payloads).returning();
  }

  async insertReceiptTx(
    tx: DatabaseTransaction,
    payload: InsertGoodsReceipt
  ): Promise<SelectGoodsReceipt> {
    const [receipt] = await tx
      .insert(goodsReceipts)
      .values(payload)
      .returning();
    return receipt;
  }

  async insertReceiptItemTx(
    tx: DatabaseTransaction,
    payload: InsertGoodsReceiptItem
  ): Promise<SelectGoodsReceiptItem> {
    const [item] = await tx
      .insert(goodsReceiptItems)
      .values(payload)
      .returning();
    return item;
  }

  /** Kunci item PO (FOR UPDATE) agar progres qtyReceived bebas race. */
  async lockItemsTx(
    tx: DatabaseTransaction,
    poId: string
  ): Promise<SelectPurchaseOrderItem[]> {
    return tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.poId, poId))
      .for('update');
  }

  async incrementItemReceivedTx(
    tx: DatabaseTransaction,
    itemId: number,
    quantity: number
  ): Promise<void> {
    await tx
      .update(purchaseOrderItems)
      .set({
        qtyReceived: sql`${purchaseOrderItems.qtyReceived} + ${quantity}`,
      })
      .where(eq(purchaseOrderItems.id, itemId));
  }

  async updateStatusTx(
    tx: DatabaseTransaction,
    id: string,
    status: PurchaseOrderStatus
  ): Promise<void> {
    await tx
      .update(purchaseOrders)
      .set({ status })
      .where(eq(purchaseOrders.id, id));
  }
}
