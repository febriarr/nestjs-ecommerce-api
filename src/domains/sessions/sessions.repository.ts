import { Injectable } from '@nestjs/common';
import { and, eq, gt, lt } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InsertSessions,
  schema,
  SelectSessions,
} from '../../infrastructure/database/schema';

export interface CreateSessionInput {
  userId: string;
  token: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}

@Injectable()
export class SessionsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: CreateSessionInput): Promise<SelectSessions> {
    const [session] = await this.database.db
      .insert(schema.sessions)
      .values({
        userId: input.userId,
        token: input.token,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
      } satisfies InsertSessions)
      .returning();

    return session;
  }

  async findByToken(token: string): Promise<SelectSessions | null> {
    const [session] = await this.database.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.token, token))
      .limit(1);

    return session ?? null;
  }

  async findActiveByToken(token: string): Promise<SelectSessions | null> {
    const [session] = await this.database.db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.token, token),
          gt(schema.sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    return session ?? null;
  }

  async findAllByUserId(userId: string): Promise<SelectSessions[]> {
    return this.database.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId));
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    await this.database.db
      .update(schema.sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));
  }

  async deleteById(sessionId: string): Promise<void> {
    await this.database.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.id, sessionId));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.database.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.token, token));
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.database.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await this.database.db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, new Date()));
  }
}
