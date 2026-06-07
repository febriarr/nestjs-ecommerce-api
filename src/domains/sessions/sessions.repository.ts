import { Injectable } from '@nestjs/common';
import { and, eq, gt, lt } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InsertSessions,
  SelectSessions,
  sessions,
} from '../../infrastructure/database/schema';
import { BaseRepository } from '../../common/abstracts/base.repository';

@Injectable()
export class SessionsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async create(input: InsertSessions): Promise<SelectSessions> {
    const [session] = await this.db
      .insert(sessions)
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
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    return session ?? null;
  }

  async findActiveByToken(token: string): Promise<SelectSessions | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return session ?? null;
  }

  async findAllByUserId(userId: string): Promise<SelectSessions[]> {
    return this.db.select().from(sessions).where(eq(sessions.userId, userId));
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async deleteById(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async deleteByToken(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async deleteExpired(): Promise<void> {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
}
