import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  categories,
  InsertCategories,
  SelectCategories,
} from '../../infrastructure/database/schema';

@Injectable()
export class CategoriesRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: string): Promise<SelectCategories | null> {
    const row = await this.db.query.categories.findFirst({
      where: and(isNull(categories.deletedAt), eq(categories.id, id)),
    });
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<SelectCategories | null> {
    const row = await this.db.query.categories.findFirst({
      where: and(isNull(categories.deletedAt), eq(categories.slug, slug)),
    });
    return row ?? null;
  }

  async findAll(): Promise<SelectCategories[]> {
    return this.db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(categories.sortOrder, categories.name);
  }

  async findParents(): Promise<SelectCategories[]> {
    return this.db.query.categories.findMany({
      where: and(isNull(categories.deletedAt), isNull(categories.parentId)),
      orderBy: asc(categories.sortOrder),
    });
  }

  /**
   * Cari row dengan sortOrder tertinggi dalam level yang sama.
   * - parentId = null  → cari di antara parent categories
   * - parentId = string → cari di antara children dari parent tersebut
   */
  async findLastSortOrder(
    parentId: string | null
  ): Promise<SelectCategories | null> {
    const row = await this.db.query.categories.findFirst({
      where: and(
        isNull(categories.deletedAt),
        parentId
          ? eq(categories.parentId, parentId)
          : isNull(categories.parentId)
      ),
      orderBy: desc(categories.sortOrder),
    });
    return row ?? null;
  }

  /**
   * Cari beberapa kategori sekaligus berdasarkan array id.
   */
  async findManyByIds(ids: string[]): Promise<SelectCategories[]> {
    return this.db
      .select()
      .from(categories)
      .where(and(isNull(categories.deletedAt), inArray(categories.id, ids)));
  }

  async insert(payload: InsertCategories): Promise<SelectCategories> {
    const [row] = await this.db.insert(categories).values(payload).returning();
    return row;
  }

  async update(
    id: string,
    payload: Partial<InsertCategories>
  ): Promise<SelectCategories> {
    const [row] = await this.db
      .update(categories)
      .set(payload)
      .where(eq(categories.id, id))
      .returning();
    return row;
  }

  /**
   * Swap sortOrder dua kategori dalam satu transaksi.
   */
  async swapSortOrder(
    a: { id: string; sortOrder: number },
    b: { id: string; sortOrder: number }
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(categories)
        .set({ sortOrder: b.sortOrder, updatedAt: new Date() })
        .where(eq(categories.id, a.id));

      await tx
        .update(categories)
        .set({ sortOrder: a.sortOrder, updatedAt: new Date() })
        .where(eq(categories.id, b.id));
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id));
  }
}
