import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InsertProductDiscount,
  productDiscounts,
  SelectProductDiscount,
} from '../../infrastructure/database/schema';

@Injectable()
export class ProductDiscountsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: number): Promise<SelectProductDiscount | null> {
    const rows = await this.db
      .select()
      .from(productDiscounts)
      .where(eq(productDiscounts.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async listByProduct(productId: number): Promise<SelectProductDiscount[]> {
    return this.db
      .select()
      .from(productDiscounts)
      .where(eq(productDiscounts.productId, productId))
      .orderBy(desc(productDiscounts.priority));
  }

  /** Promo aktif untuk product pada waktu `now`, prioritas tertinggi dulu. */
  async findActive(
    productId: number,
    now: Date
  ): Promise<SelectProductDiscount[]> {
    return this.db
      .select()
      .from(productDiscounts)
      .where(
        and(
          eq(productDiscounts.productId, productId),
          eq(productDiscounts.isActive, true),
          lte(productDiscounts.startAt, now),
          gte(productDiscounts.endAt, now)
        )
      )
      .orderBy(desc(productDiscounts.priority));
  }

  async insert(payload: InsertProductDiscount): Promise<SelectProductDiscount> {
    const [row] = await this.db
      .insert(productDiscounts)
      .values(payload)
      .returning();
    return row;
  }

  async update(
    id: number,
    payload: Partial<InsertProductDiscount>
  ): Promise<SelectProductDiscount> {
    const [row] = await this.db
      .update(productDiscounts)
      .set(payload)
      .where(eq(productDiscounts.id, id))
      .returning();
    return row;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(productDiscounts).where(eq(productDiscounts.id, id));
  }
}
