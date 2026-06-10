import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
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

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id));
  }
}
