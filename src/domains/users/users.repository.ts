import { Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from 'drizzle-orm';

import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  users,
  SelectUser,
  InsertUser,
  Role,
  Status,
  outlets,
  userContacts,
} from '../../infrastructure/database/schema';
import { BaseRepository } from '../../common/abstracts/base.repository';

export interface UserListFilter {
  role?: Role;
  status?: Status;
  search?: string;
  outletId?: number;
}

export type SelectUserWithOutlet = SelectUser & {
  outlet: {
    code: string;
  } | null;
};

export type SelectUserWithAddress = SelectUser & {
  city: string | null;
  province: string | null;
};

const STAFF_ROLES = ['cashier', 'admin', 'super_admin'] as const;

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: string): Promise<SelectUserWithOutlet | null> {
    const [user] = await this.db
      .select({
        ...getTableColumns(users),
        outlet: {
          code: outlets.code,
        },
      })
      .from(users)
      .leftJoin(outlets, eq(users.outletId, outlets.id))
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  async findByEmail(email: string): Promise<SelectUserWithOutlet | null> {
    const [user] = await this.db
      .select({
        ...getTableColumns(users),
        outlet: {
          code: outlets.code,
        },
      })
      .from(users)
      .leftJoin(outlets, eq(users.outletId, outlets.id))
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return user ?? null;
  }

  /** Keyset pagination (uuidv7 time-ordered), urut terbaru dulu. */

  async list(
    filter: UserListFilter,
    cursorId: string | null,
    limit: number
  ): Promise<SelectUserWithOutlet[]> {
    const conditions = [isNull(users.deletedAt)];

    if (filter.role) {
      conditions.push(eq(users.role, filter.role));
    } else {
      conditions.push(inArray(users.role, [...STAFF_ROLES]));
    }

    if (filter.status) conditions.push(eq(users.status, filter.status));
    if (filter.search) {
      const pattern = `%${filter.search}%`;
      const search = or(
        ilike(users.name, pattern),
        ilike(users.email, pattern)
      );
      if (search) conditions.push(search);
    }
    if (filter.outletId) conditions.push(eq(users.outletId, filter.outletId));
    if (cursorId !== null) conditions.push(lt(users.id, cursorId));

    return this.db
      .select({
        ...getTableColumns(users),
        outlet: { code: outlets.code },
      })
      .from(users)
      .leftJoin(outlets, eq(users.outletId, outlets.id))
      .where(and(...conditions))
      .orderBy(desc(users.id))
      .limit(limit + 1);
  }

  async customerList(
    filter: Pick<UserListFilter, 'search' | 'role' | 'status'>,
    cursorId: string | null,
    limit: number
  ): Promise<SelectUserWithAddress[]> {
    const conditions = [isNull(users.deletedAt), eq(users.role, 'customer')];
    if (filter.role) conditions.push(eq(users.role, filter.role));
    if (filter.status) conditions.push(eq(users.status, filter.status));
    if (filter.search) {
      const pattern = `%${filter.search}%`;
      const search = or(
        ilike(users.name, pattern),
        ilike(users.email, pattern)
      );
      if (search) conditions.push(search);
    }
    if (cursorId !== null) conditions.push(lt(users.id, cursorId));

    return this.db
      .select({
        ...getTableColumns(users),
        city: userContacts.city,
        province: userContacts.province,
      })
      .from(users)
      .leftJoin(userContacts, eq(users.id, userContacts.id))
      .where(and(...conditions))
      .orderBy(desc(users.id))
      .limit(limit + 1);
  }

  async insert(data: InsertUser): Promise<SelectUser> {
    const [created] = await this.db.insert(users).values(data).returning();
    return created;
  }

  async update(id: string, data: Partial<InsertUser>): Promise<SelectUser> {
    const [updated] = await this.db
      .update(users)
      .set(data)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
  }
}
