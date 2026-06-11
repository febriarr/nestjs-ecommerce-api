import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, isNull, lt, or } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InsertSupplier,
  SelectSupplier,
  suppliers,
} from '../../infrastructure/database/schema';

export interface SupplierListFilter {
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class SuppliersRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: number): Promise<SelectSupplier | null> {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(and(isNull(suppliers.deletedAt), eq(suppliers.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByCode(code: string): Promise<SelectSupplier | null> {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(and(isNull(suppliers.deletedAt), eq(suppliers.code, code)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Keyset pagination (tanpa count): ambil limit + 1 baris, urut id desc. */
  async list(
    filter: SupplierListFilter,
    cursorId: number | null,
    limit: number
  ): Promise<SelectSupplier[]> {
    const conditions = [isNull(suppliers.deletedAt)];
    if (filter.isActive !== undefined)
      conditions.push(eq(suppliers.isActive, filter.isActive));
    if (filter.search) {
      const pattern = `%${filter.search}%`;
      const search = or(
        ilike(suppliers.name, pattern),
        ilike(suppliers.code, pattern)
      );
      if (search) conditions.push(search);
    }
    if (cursorId !== null) conditions.push(lt(suppliers.id, cursorId));

    return this.db
      .select()
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(desc(suppliers.id))
      .limit(limit + 1);
  }

  async insert(payload: InsertSupplier): Promise<SelectSupplier> {
    const [supplier] = await this.db
      .insert(suppliers)
      .values(payload)
      .returning();
    return supplier;
  }

  async update(
    id: number,
    payload: Partial<InsertSupplier>
  ): Promise<SelectSupplier> {
    const [supplier] = await this.db
      .update(suppliers)
      .set(payload)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(suppliers)
      .set({ deletedAt: new Date() })
      .where(eq(suppliers.id, id));
  }
}
