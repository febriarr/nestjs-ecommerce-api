import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { DatabaseTransaction } from '../../infrastructure/database/database.types';
import {
  InsertOutlet,
  SelectOutlet,
  SelectOutletInventory,
  SelectStockMovement,
  StockMovementRefType,
  StockMovementType,
  outletInventory,
  outlets,
  products,
  productVariants,
  stockMovements,
} from '../../infrastructure/database/schema';

export interface OutletListFilter {
  isActive?: boolean;
  servesOnline?: boolean;
  search?: string;
}

/** Baris inventori + identitas variant untuk response/list. */
export interface InventoryView {
  outletId: number;
  variantId: number;
  skuCode: string;
  variantName: string | null;
  productName: string;
  stock: number;
  reservedStock: number;
  updatedAt: Date;
}

/** Potret ketersediaan (outlet, variant) untuk evaluasi pemenuhan order. */
export interface AvailabilityRow {
  outletId: number;
  variantId: number;
  availableStock: number;
}

/**
 * Konteks audit sebuah mutasi stok — diteruskan caller agar setiap baris
 * ledger stock_movements bisa di-drill-down ke dokumen sumbernya.
 */
export interface MovementContext {
  refType?: StockMovementRefType;
  refId?: string;
  actorId?: string;
  note?: string;
}

@Injectable()
export class OutletsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- outlets ----------

  async findById(id: number): Promise<SelectOutlet | null> {
    const rows = await this.db
      .select()
      .from(outlets)
      .where(and(isNull(outlets.deletedAt), eq(outlets.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByCode(code: string): Promise<SelectOutlet | null> {
    const rows = await this.db
      .select()
      .from(outlets)
      .where(and(isNull(outlets.deletedAt), eq(outlets.code, code)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination (tanpa count): ambil limit + 1 baris, urut id desc. */
  async list(
    filter: OutletListFilter,
    cursorId: number | null,
    limit: number
  ): Promise<SelectOutlet[]> {
    const conditions = [isNull(outlets.deletedAt)];
    if (filter.isActive !== undefined)
      conditions.push(eq(outlets.isActive, filter.isActive));
    if (filter.servesOnline !== undefined)
      conditions.push(eq(outlets.servesOnline, filter.servesOnline));
    if (filter.search) {
      const pattern = `%${filter.search}%`;
      const search = or(
        ilike(outlets.name, pattern),
        ilike(outlets.code, pattern),
        ilike(outlets.city, pattern)
      );
      if (search) conditions.push(search);
    }
    if (cursorId !== null) conditions.push(lt(outlets.id, cursorId));

    return this.db
      .select()
      .from(outlets)
      .where(and(...conditions))
      .orderBy(desc(outlets.id))
      .limit(limit + 1);
  }

  /** Outlet kandidat routing order ONLINE: aktif + melayani online. */
  async listOnlineCandidates(): Promise<SelectOutlet[]> {
    return this.db
      .select()
      .from(outlets)
      .where(
        and(
          isNull(outlets.deletedAt),
          eq(outlets.isActive, true),
          eq(outlets.servesOnline, true)
        )
      )
      .orderBy(outlets.id);
  }

  /**
   * Insert outlet. Bila `isOnlineDefault` true, unset default lama dulu dalam
   * transaksi (partial unique index menjadi pagar terakhir).
   */
  async insert(payload: InsertOutlet): Promise<SelectOutlet> {
    return this.withTransaction(async (tx) => {
      if (payload.isOnlineDefault === true) {
        await tx
          .update(outlets)
          .set({ isOnlineDefault: false })
          .where(eq(outlets.isOnlineDefault, true));
      }
      const [outlet] = await tx.insert(outlets).values(payload).returning();
      return outlet;
    });
  }

  async update(
    id: number,
    payload: Partial<InsertOutlet>
  ): Promise<SelectOutlet> {
    return this.withTransaction(async (tx) => {
      if (payload.isOnlineDefault === true) {
        await tx
          .update(outlets)
          .set({ isOnlineDefault: false })
          .where(eq(outlets.isOnlineDefault, true));
      }
      const [outlet] = await tx
        .update(outlets)
        .set(payload)
        .where(eq(outlets.id, id))
        .returning();
      return outlet;
    });
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(outlets)
      .set({ deletedAt: new Date() })
      .where(eq(outlets.id, id));
  }

  // ---------- inventory ----------

  async variantExists(variantId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          isNull(productVariants.deletedAt),
          eq(productVariants.id, variantId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async findInventoryRow(
    outletId: number,
    variantId: number
  ): Promise<SelectOutletInventory | null> {
    const rows = await this.db
      .select()
      .from(outletInventory)
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findInventoryView(
    outletId: number,
    variantId: number
  ): Promise<InventoryView | null> {
    const rows = await this.db
      .select({
        outletId: outletInventory.outletId,
        variantId: outletInventory.variantId,
        skuCode: productVariants.skuCode,
        variantName: productVariants.variantName,
        productName: products.name,
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
        updatedAt: outletInventory.updatedAt,
      })
      .from(outletInventory)
      .innerJoin(
        productVariants,
        eq(outletInventory.variantId, productVariants.id)
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination inventori sebuah outlet, urut id inventori desc. */
  async listInventory(
    outletId: number,
    cursorId: number | null,
    limit: number
  ): Promise<(InventoryView & { id: number })[]> {
    const conditions = [eq(outletInventory.outletId, outletId)];
    if (cursorId !== null) conditions.push(lt(outletInventory.id, cursorId));

    return this.db
      .select({
        id: outletInventory.id,
        outletId: outletInventory.outletId,
        variantId: outletInventory.variantId,
        skuCode: productVariants.skuCode,
        variantName: productVariants.variantName,
        productName: products.name,
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
        updatedAt: outletInventory.updatedAt,
      })
      .from(outletInventory)
      .innerJoin(
        productVariants,
        eq(outletInventory.variantId, productVariants.id)
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(outletInventory.id))
      .limit(limit + 1);
  }

  /**
   * Set stok absolut (upsert) + tulis ledger ADJUSTMENT dengan delta yang
   * dihitung dari nilai lama (dibaca FOR UPDATE — kebal race). Delta nol
   * tidak menghasilkan baris ledger.
   */
  async setInventoryAudited(
    outletId: number,
    variantId: number,
    stock: number,
    ctx: MovementContext = {}
  ): Promise<SelectOutletInventory> {
    return this.withTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(outletInventory)
        .where(
          and(
            eq(outletInventory.outletId, outletId),
            eq(outletInventory.variantId, variantId)
          )
        )
        .for('update')
        .limit(1);
      const oldStock = existing[0]?.stock ?? 0;

      const [row] = await tx
        .insert(outletInventory)
        .values({ outletId, variantId, stock })
        .onConflictDoUpdate({
          target: [outletInventory.outletId, outletInventory.variantId],
          set: { stock, updatedAt: new Date() },
        })
        .returning();

      const delta = stock - oldStock;
      if (delta !== 0) {
        await this.insertMovement(tx, {
          outletId,
          variantId,
          type: 'ADJUSTMENT',
          stockChange: delta,
          stockAfter: row.stock,
          reservedAfter: row.reservedStock,
          ctx,
        });
      }
      return row;
    });
  }

  /** Ketersediaan (stock - reserved) untuk kombinasi outlet × variant. */
  async availability(
    outletIds: number[],
    variantIds: number[]
  ): Promise<AvailabilityRow[]> {
    if (outletIds.length === 0 || variantIds.length === 0) return [];
    return this.db
      .select({
        outletId: outletInventory.outletId,
        variantId: outletInventory.variantId,
        availableStock:
          sql<number>`(${outletInventory.stock} - ${outletInventory.reservedStock})::int`.as(
            'available_stock'
          ),
      })
      .from(outletInventory)
      .where(
        and(
          inArray(outletInventory.outletId, outletIds),
          inArray(outletInventory.variantId, variantIds)
        )
      );
  }

  // ---------- stock movement (tx-scoped, anti-overselling + ledger) ----------
  // SEMUA mutasi outlet_inventory lewat method di bawah; setiap method menulis
  // baris stock_movements dalam transaksi yang sama (jejak audit lengkap).

  /**
   * Reservasi stok secara atomic: hanya berhasil bila available >= quantity
   * (dicek dan dimutasi dalam SATU statement — bebas race antar checkout).
   * Ledger: RESERVE (reservedChange +quantity).
   */
  async reserveStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number,
    ctx: MovementContext
  ): Promise<boolean> {
    const rows = await tx
      .update(outletInventory)
      .set({
        reservedStock: sql`${outletInventory.reservedStock} + ${quantity}`,
      })
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId),
          sql`${outletInventory.stock} - ${outletInventory.reservedStock} >= ${quantity}`
        )
      )
      .returning({
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
      });
    if (rows.length === 0) return false;

    await this.insertMovement(tx, {
      outletId,
      variantId,
      type: 'RESERVE',
      reservedChange: quantity,
      stockAfter: rows[0].stock,
      reservedAfter: rows[0].reservedStock,
      ctx,
    });
    return true;
  }

  /**
   * Lepas reservasi (cancel/expired). Baris dikunci FOR UPDATE agar delta
   * aktual (ter-clamp ke reserved tersisa) tercatat akurat di ledger RELEASE.
   */
  async releaseStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number,
    ctx: MovementContext
  ): Promise<void> {
    const existing = await tx
      .select()
      .from(outletInventory)
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId)
        )
      )
      .for('update')
      .limit(1);
    if (existing.length === 0) return;

    const actual = Math.min(quantity, existing[0].reservedStock);
    if (actual === 0) return;

    const [row] = await tx
      .update(outletInventory)
      .set({
        reservedStock: sql`${outletInventory.reservedStock} - ${actual}`,
      })
      .where(eq(outletInventory.id, existing[0].id))
      .returning({
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
      });

    await this.insertMovement(tx, {
      outletId,
      variantId,
      type: 'RELEASE',
      reservedChange: -actual,
      stockAfter: row.stock,
      reservedAfter: row.reservedStock,
      ctx,
    });
  }

  /**
   * Finalisasi setelah pembayaran: kurangi stock & lepas reservasi sekaligus.
   * Ledger: SALE (stockChange -quantity, reservedChange -quantity).
   */
  async finalizeStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number,
    ctx: MovementContext
  ): Promise<boolean> {
    const rows = await tx
      .update(outletInventory)
      .set({
        stock: sql`${outletInventory.stock} - ${quantity}`,
        reservedStock: sql`${outletInventory.reservedStock} - ${quantity}`,
      })
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId),
          sql`${outletInventory.stock} >= ${quantity}`,
          sql`${outletInventory.reservedStock} >= ${quantity}`
        )
      )
      .returning({
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
      });
    if (rows.length === 0) return false;

    await this.insertMovement(tx, {
      outletId,
      variantId,
      type: 'SALE',
      stockChange: -quantity,
      reservedChange: -quantity,
      stockAfter: rows[0].stock,
      reservedAfter: rows[0].reservedStock,
      ctx,
    });
    return true;
  }

  /**
   * Tambah stok fisik (upsert) — penerimaan barang (PURCHASE_RECEIPT) atau
   * transfer masuk (TRANSFER_IN).
   */
  async addStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number,
    type: Extract<StockMovementType, 'PURCHASE_RECEIPT' | 'TRANSFER_IN'>,
    ctx: MovementContext
  ): Promise<void> {
    const [row] = await tx
      .insert(outletInventory)
      .values({ outletId, variantId, stock: quantity })
      .onConflictDoUpdate({
        target: [outletInventory.outletId, outletInventory.variantId],
        set: {
          stock: sql`${outletInventory.stock} + ${quantity}`,
          updatedAt: new Date(),
        },
      })
      .returning({
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
      });

    await this.insertMovement(tx, {
      outletId,
      variantId,
      type,
      stockChange: quantity,
      stockAfter: row.stock,
      reservedAfter: row.reservedStock,
      ctx,
    });
  }

  /**
   * Kurangi stok fisik untuk transfer keluar — hanya berhasil bila available
   * (stock - reserved) mencukupi; atomic seperti reserveStock.
   */
  async deductStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number,
    ctx: MovementContext
  ): Promise<boolean> {
    const rows = await tx
      .update(outletInventory)
      .set({ stock: sql`${outletInventory.stock} - ${quantity}` })
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId),
          sql`${outletInventory.stock} - ${outletInventory.reservedStock} >= ${quantity}`
        )
      )
      .returning({
        stock: outletInventory.stock,
        reservedStock: outletInventory.reservedStock,
      });
    if (rows.length === 0) return false;

    await this.insertMovement(tx, {
      outletId,
      variantId,
      type: 'TRANSFER_OUT',
      stockChange: -quantity,
      stockAfter: rows[0].stock,
      reservedAfter: rows[0].reservedStock,
      ctx,
    });
    return true;
  }

  // ---------- ledger ----------

  /** Timeline ledger sebuah (outlet, variant), keyset desc id. */
  async listMovements(
    outletId: number,
    variantId: number,
    cursorId: number | null,
    limit: number
  ): Promise<SelectStockMovement[]> {
    const conditions = [
      eq(stockMovements.outletId, outletId),
      eq(stockMovements.variantId, variantId),
    ];
    if (cursorId !== null) conditions.push(lt(stockMovements.id, cursorId));

    return this.db
      .select()
      .from(stockMovements)
      .where(and(...conditions))
      .orderBy(desc(stockMovements.id))
      .limit(limit + 1);
  }

  /** Satu-satunya penulis baris ledger — selalu dalam transaksi mutasi. */
  private async insertMovement(
    tx: DatabaseTransaction,
    params: {
      outletId: number;
      variantId: number;
      type: StockMovementType;
      stockChange?: number;
      reservedChange?: number;
      stockAfter: number;
      reservedAfter: number;
      ctx: MovementContext;
    }
  ): Promise<void> {
    await tx.insert(stockMovements).values({
      outletId: params.outletId,
      variantId: params.variantId,
      type: params.type,
      stockChange: params.stockChange ?? 0,
      reservedChange: params.reservedChange ?? 0,
      stockAfter: params.stockAfter,
      reservedAfter: params.reservedAfter,
      refType: params.ctx.refType ?? null,
      refId: params.ctx.refId ?? null,
      actorId: params.ctx.actorId ?? null,
      note: params.ctx.note ?? null,
    });
  }
}
