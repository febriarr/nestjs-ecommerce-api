import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';

import { DatabaseService } from 'src/database/database.service';
import { schema, SelectUser, InsertUser } from 'src/database/schema';

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findById(id: string): Promise<SelectUser | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(schema.user)
      .where(and(eq(schema.user.id, id), isNull(schema.user.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<SelectUser | null> {
    const [user] = await this.databaseService.db
      .select()
      .from(schema.user)
      .where(and(eq(schema.user.email, email), isNull(schema.user.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async insert(data: InsertUser): Promise<SelectUser> {
    const [created] = await this.databaseService.db
      .insert(schema.user)
      .values(data)
      .returning();

    if (!created) {
      throw new Error('Insert failed');
    }

    return created;
  }

  async update(id: string, data: Partial<InsertUser>): Promise<SelectUser> {
    const [updated] = await this.databaseService.db
      .update(schema.user)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.user.id, id), isNull(schema.user.deletedAt)))
      .returning();

    if (!updated) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return updated;
  }

  // soft delete
  async softDelete(id: string): Promise<SelectUser> {
    const [deleted] = await this.databaseService.db
      .update(schema.user)
      .set({ deletedAt: new Date() })
      .where(and(eq(schema.user.id, id), isNull(schema.user.deletedAt)))
      .returning();

    if (!deleted) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return deleted;
  }
}
