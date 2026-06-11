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
  outletInventory,
  outlets,
  products,
  productVariants,
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

  /** Upsert stok absolut; reservedStock tidak disentuh. */
  async upsertInventory(
    outletId: number,
    variantId: number,
    stock: number
  ): Promise<SelectOutletInventory> {
    const [row] = await this.db
      .insert(outletInventory)
      .values({ outletId, variantId, stock })
      .onConflictDoUpdate({
        target: [outletInventory.outletId, outletInventory.variantId],
        set: { stock, updatedAt: new Date() },
      })
      .returning();
    return row;
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

  // ---------- stock movement (tx-scoped, anti-overselling) ----------

  /**
   * Reservasi stok secara atomic: hanya berhasil bila available >= quantity
   * (dicek dan dimutasi dalam SATU statement — bebas race antar checkout).
   */
  async reserveStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number
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
      .returning({ id: outletInventory.id });
    return rows.length > 0;
  }

  /** Lepas reservasi (cancel/expired); di-clamp agar tidak negatif. */
  async releaseStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number
  ): Promise<void> {
    await tx
      .update(outletInventory)
      .set({
        reservedStock: sql`greatest(${outletInventory.reservedStock} - ${quantity}, 0)`,
      })
      .where(
        and(
          eq(outletInventory.outletId, outletId),
          eq(outletInventory.variantId, variantId)
        )
      );
  }

  /** Finalisasi setelah pembayaran: kurangi stock & lepas reservasi sekaligus. */
  async finalizeStock(
    tx: DatabaseTransaction,
    outletId: number,
    variantId: number,
    quantity: number
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
      .returning({ id: outletInventory.id });
    return rows.length > 0;
  }
}
