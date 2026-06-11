import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, or } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DatabaseTransaction } from '../../infrastructure/database/database.types';
import {
  InsertStockTransfer,
  InsertStockTransferItem,
  SelectStockTransfer,
  StockTransferStatus,
  productVariants,
  products,
  stockTransferItems,
  stockTransfers,
  users,
} from '../../infrastructure/database/schema';

export interface TransferListFilter {
  status?: StockTransferStatus;
  /** Outlet asal ATAU tujuan. */
  outletId?: number;
}

/** Item transfer + identitas variant untuk response. */
export interface TransferItemView {
  variantId: number;
  skuCode: string;
  variantName: string | null;
  productName: string;
  quantity: number;
}

@Injectable()
export class StockTransfersRepository extends BaseRepository {
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

  async findById(id: string): Promise<SelectStockTransfer | null> {
    const rows = await this.db
      .select()
      .from(stockTransfers)
      .where(and(isNull(stockTransfers.deletedAt), eq(stockTransfers.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination (uuidv7 time-ordered), urut terbaru dulu. */
  async list(
    filter: TransferListFilter,
    cursorId: string | null,
    limit: number
  ): Promise<SelectStockTransfer[]> {
    const conditions = [isNull(stockTransfers.deletedAt)];
    if (filter.status)
      conditions.push(eq(stockTransfers.status, filter.status));
    if (filter.outletId !== undefined) {
      const outletMatch = or(
        eq(stockTransfers.fromOutletId, filter.outletId),
        eq(stockTransfers.toOutletId, filter.outletId)
      );
      if (outletMatch) conditions.push(outletMatch);
    }
    if (cursorId !== null) conditions.push(lt(stockTransfers.id, cursorId));

    return this.db
      .select()
      .from(stockTransfers)
      .where(and(...conditions))
      .orderBy(desc(stockTransfers.id))
      .limit(limit + 1);
  }

  /** Buat transfer + item dalam satu transaksi. */
  async createWithItems(
    payload: InsertStockTransfer,
    items: Omit<InsertStockTransferItem, 'transferId'>[]
  ): Promise<SelectStockTransfer> {
    return this.withTransaction(async (tx) => {
      const [transfer] = await tx
        .insert(stockTransfers)
        .values(payload)
        .returning();
      await tx
        .insert(stockTransferItems)
        .values(items.map((item) => ({ ...item, transferId: transfer.id })));
      return transfer;
    });
  }

  async update(
    id: string,
    payload: Partial<InsertStockTransfer>
  ): Promise<SelectStockTransfer> {
    const [transfer] = await this.db
      .update(stockTransfers)
      .set(payload)
      .where(eq(stockTransfers.id, id))
      .returning();
    return transfer;
  }

  /** Ganti SELURUH item (edit saat DRAFT) — delete + insert dalam transaksi. */
  async replaceItems(
    id: string,
    items: Omit<InsertStockTransferItem, 'transferId'>[]
  ): Promise<void> {
    await this.withTransaction(async (tx) => {
      await tx
        .delete(stockTransferItems)
        .where(eq(stockTransferItems.transferId, id));
      await tx
        .insert(stockTransferItems)
        .values(items.map((item) => ({ ...item, transferId: id })));
    });
  }

  async listItems(id: string): Promise<TransferItemView[]> {
    return this.db
      .select({
        variantId: stockTransferItems.variantId,
        skuCode: productVariants.skuCode,
        variantName: productVariants.variantName,
        productName: products.name,
        quantity: stockTransferItems.quantity,
      })
      .from(stockTransferItems)
      .innerJoin(
        productVariants,
        eq(stockTransferItems.variantId, productVariants.id)
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(stockTransferItems.transferId, id))
      .orderBy(stockTransferItems.id);
  }

  /**
   * Transisi status kondisional dalam transaksi (atomic guard) — null bila
   * status sudah berubah.
   */
  async updateStatusIfTx(
    tx: DatabaseTransaction,
    id: string,
    from: StockTransferStatus,
    patch: Partial<InsertStockTransfer>
  ): Promise<SelectStockTransfer | null> {
    const rows = await tx
      .update(stockTransfers)
      .set(patch)
      .where(and(eq(stockTransfers.id, id), eq(stockTransfers.status, from)))
      .returning();
    return rows[0] ?? null;
  }
}
