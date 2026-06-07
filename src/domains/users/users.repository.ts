import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  users,
  SelectUser,
  InsertUser,
} from '../../infrastructure/database/schema';
import { BaseRepository } from '../../common/abstracts/base.repository';

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: string): Promise<SelectUser | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<SelectUser | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async insert(data: InsertUser): Promise<SelectUser> {
    const [created] = await this.db.insert(users).values(data).returning();

    if (!created) {
      throw new Error('Insert failed');
    }

    return created;
  }

  async update(id: string, data: Partial<InsertUser>): Promise<SelectUser> {
    const [updated] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return updated;
  }

  // soft delete
  async softDelete(id: string): Promise<SelectUser> {
    const [deleted] = await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return deleted;
  }
}
