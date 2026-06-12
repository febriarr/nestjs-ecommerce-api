import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { userContacts } from '../../infrastructure/database/schema';
import { BaseRepository } from '../../common/abstracts/base.repository';

export type SelectUserContact = typeof userContacts.$inferSelect;
export type InsertUserContact = typeof userContacts.$inferInsert;

@Injectable()
export class UserContactsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  /** Seluruh alamat hidup milik user — primary dulu, lalu terbaru. */
  async listByUser(userId: string): Promise<SelectUserContact[]> {
    return this.db
      .select()
      .from(userContacts)
      .where(
        and(eq(userContacts.userId, userId), isNull(userContacts.deletedAt))
      )
      .orderBy(desc(userContacts.isPrimary), desc(userContacts.createdAt));
  }

  async findById(
    contactId: string,
    userId: string
  ): Promise<SelectUserContact | null> {
    const [contact] = await this.db
      .select()
      .from(userContacts)
      .where(
        and(
          eq(userContacts.id, contactId),
          eq(userContacts.userId, userId),
          isNull(userContacts.deletedAt)
        )
      )
      .limit(1);
    return contact ?? null;
  }

  /**
   * Insert alamat. Bila `isPrimary` true, primary lama di-unset dulu dalam
   * transaksi (partial unique index satu-primary-per-user jadi pagar terakhir).
   */
  async insert(payload: InsertUserContact): Promise<SelectUserContact> {
    return this.withTransaction(async (tx) => {
      if (payload.isPrimary === true) {
        await tx
          .update(userContacts)
          .set({ isPrimary: false })
          .where(
            and(
              eq(userContacts.userId, payload.userId),
              eq(userContacts.isPrimary, true)
            )
          );
      }
      const [contact] = await tx
        .insert(userContacts)
        .values(payload)
        .returning();
      return contact;
    });
  }

  async update(
    contactId: string,
    userId: string,
    payload: Partial<InsertUserContact>
  ): Promise<SelectUserContact> {
    return this.withTransaction(async (tx) => {
      if (payload.isPrimary === true) {
        await tx
          .update(userContacts)
          .set({ isPrimary: false })
          .where(
            and(
              eq(userContacts.userId, userId),
              eq(userContacts.isPrimary, true),
              ne(userContacts.id, contactId)
            )
          );
      }
      const [contact] = await tx
        .update(userContacts)
        .set(payload)
        .where(eq(userContacts.id, contactId))
        .returning();
      return contact;
    });
  }

  /** Jadikan satu alamat sebagai primary (unset lainnya, atomic). */
  async setPrimary(
    contactId: string,
    userId: string
  ): Promise<SelectUserContact> {
    return this.withTransaction(async (tx) => {
      await tx
        .update(userContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(userContacts.userId, userId),
            eq(userContacts.isPrimary, true),
            ne(userContacts.id, contactId)
          )
        );
      const [contact] = await tx
        .update(userContacts)
        .set({ isPrimary: true })
        .where(eq(userContacts.id, contactId))
        .returning();
      return contact;
    });
  }

  async softDelete(contactId: string): Promise<void> {
    await this.db
      .update(userContacts)
      .set({ deletedAt: new Date(), isPrimary: false })
      .where(eq(userContacts.id, contactId));
  }
}
