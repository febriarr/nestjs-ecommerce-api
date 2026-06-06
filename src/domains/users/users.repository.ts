import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  schema,
  SelectUser,
  InsertUser,
} from '../../infrastructure/database/schema';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string): Promise<SelectUser | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<SelectUser | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async insert(data: InsertUser): Promise<SelectUser> {
    const [created] = await this.databaseService.db
      .insert(schema.users)
      .values(data)
      .returning();

    if (!created) {
      throw new Error('Insert failed');
    }

    return created;
  }

  async update(id: string, data: Partial<InsertUser>): Promise<SelectUser> {
    const [updated] = await this.databaseService.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return updated;
  }

  // soft delete
  async softDelete(id: string): Promise<SelectUser> {
    const [deleted] = await this.databaseService.db
      .update(schema.users)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return deleted;
  }
}
