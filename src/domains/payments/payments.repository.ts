import { Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InsertPayment,
  SelectPayment,
  payments,
} from '../../infrastructure/database/schema';

@Injectable()
export class PaymentsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: string): Promise<SelectPayment | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Attempt PENDING milik sebuah order (maks. satu — partial unique index). */
  async findPendingByOrder(orderId: string): Promise<SelectPayment | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, 'PENDING')))
      .limit(1);
    return rows[0] ?? null;
  }

  async findSucceededByOrder(orderId: string): Promise<SelectPayment | null> {
    const rows = await this.db
      .select()
      .from(payments)
      .where(
        and(eq(payments.orderId, orderId), eq(payments.status, 'SUCCEEDED'))
      )
      .orderBy(desc(payments.id))
      .limit(1);
    return rows[0] ?? null;
  }

  async insert(payload: InsertPayment): Promise<SelectPayment> {
    const [payment] = await this.db
      .insert(payments)
      .values(payload)
      .returning();
    return payment;
  }

  async update(
    id: string,
    payload: Partial<InsertPayment>
  ): Promise<SelectPayment> {
    const [payment] = await this.db
      .update(payments)
      .set(payload)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }
}
