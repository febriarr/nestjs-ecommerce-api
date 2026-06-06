import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  SessionNotFoundException,
  SessionRevokedException,
} from '../../common/exceptions/domains/sessions.exceptions';
import { SelectSessions } from '../../infrastructure/database/schema';
import { SessionsRepository } from './sessions.repository';

const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

export interface CreateSessionInput {
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface SessionContext {
  session: SelectSessions;
  token: string;
}

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async create(input: CreateSessionInput): Promise<SessionContext> {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(plainToken);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    const session = await this.sessionsRepository.create({
      userId: input.userId,
      token: hashedToken,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt,
    });

    // Return plain token ke client, hash disimpan di DB
    return { session, token: plainToken };
  }

  async validate(plainToken: string): Promise<SelectSessions> {
    const hashedToken = this.hashToken(plainToken);
    const session = await this.sessionsRepository.findByToken(hashedToken);

    if (!session) throw SessionNotFoundException();

    if (session.expiresAt < new Date()) {
      await this.sessionsRepository.deleteById(session.id);
      throw SessionRevokedException();
    }

    await this.sessionsRepository.updateLastActivity(session.id);

    return session;
  }

  async revoke(plainToken: string): Promise<void> {
    const hashedToken = this.hashToken(plainToken);
    await this.sessionsRepository.deleteByToken(hashedToken);
  }

  async revokeAll(userId: string): Promise<void> {
    await this.sessionsRepository.deleteAllByUserId(userId);
  }

  async getUserSessions(userId: string): Promise<SelectSessions[]> {
    return this.sessionsRepository.findAllByUserId(userId);
  }

  async cleanupExpired(): Promise<void> {
    await this.sessionsRepository.deleteExpired();
  }

  private hashToken(plainToken: string): string {
    return crypto.createHash('sha256').update(plainToken).digest('hex');
  }
}
