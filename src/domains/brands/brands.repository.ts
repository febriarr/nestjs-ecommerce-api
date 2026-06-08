import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  brands,
  InsertBrands,
  SelectBrands,
} from '../../infrastructure/database/schema';
import { and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class BrandsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: number): Promise<SelectBrands | null> {
    const brand = await this.db.query.brands.findFirst({
      where: and(isNull(brands.deletedAt), eq(brands.id, id)),
    });
    return brand ?? null;
  }

  async findAll(): Promise<SelectBrands[]> {
    const brand = await this.db.query.brands.findMany({
      where: isNull(brands.deletedAt),
    });
    return brand;
  }

  async findBySlug(slug: string): Promise<SelectBrands | null> {
    const brand = await this.db.query.brands.findFirst({
      where: and(isNull(brands.deletedAt), eq(brands.slug, slug)),
    });

    return brand ?? null;
  }

  async insert(payload: InsertBrands): Promise<SelectBrands> {
    const [brand] = await this.db.insert(brands).values(payload).returning();
    return brand;
  }

  async update(
    id: number,
    payload: Partial<InsertBrands>
  ): Promise<SelectBrands> {
    const [brand] = await this.db
      .update(brands)
      .set(payload)
      .where(eq(brands.id, id))
      .returning();
    return brand;
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(brands)
      .set({ deletedAt: new Date() })
      .where(eq(brands.id, id));
  }
}
