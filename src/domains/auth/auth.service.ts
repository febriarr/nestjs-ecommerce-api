import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import {
  buildSessionCookieOptions,
  CLEAR_SESSION_COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
} from './auth.constants';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { SessionsService } from '../sessions/sessions.service';
import { GOOGLE_TOKEN_VERIFIER, GoogleProfile } from './google-token.verifier';
import type { GoogleTokenVerifier } from './google-token.verifier';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { AuthResponseDto, SessionResponseDto } from './dto/response-auth.dto';
import { SelectUser } from '../../infrastructure/database/schema';
import { AuthInvalidCredentialsException } from '../../common/exceptions/domains/auth.exceptions';
import { UserSuspendedException } from '../../common/exceptions/domains/user.exceptions';

/** Identitas client untuk audit sesi (user agent + IP). */
export interface ClientMeta {
  userAgent: string | null;
  ipAddress: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly sessionsService: SessionsService,
    @Inject(GOOGLE_TOKEN_VERIFIER)
    private readonly googleVerifier: GoogleTokenVerifier
  ) {}

  /** Registrasi publik (selalu customer) + langsung login (terbit sesi). */
  async register(
    dto: RegisterDTO,
    meta: ClientMeta,
    res: Response
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.createUser({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      phone: dto.phone,
    });
    return this.issueSession(user.id, meta, res);
  }

  async login(
    dto: LoginDTO,
    meta: ClientMeta,
    res: Response
  ): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email);
    // Pesan & kode error identik untuk semua kegagalan (anti enumerasi email).
    if (!user || user.password === null) {
      throw AuthInvalidCredentialsException();
    }
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw AuthInvalidCredentialsException();
    }
    this.assertNotSuspended(user);

    return this.issueSession(user.id, meta, res);
  }

  /**
   * Login Google (GIS): FE mengirim `credential` (ID token) → diverifikasi
   * (signature/issuer/audience/expiry) → user di-upsert by email → sesi
   * terbit. Akun baru otomatis terdaftar tanpa password (OAuth-only;
   * bisa menyetel password kemudian via PATCH /users/:id/password).
   */
  async loginWithGoogle(
    dto: GoogleLoginDTO,
    meta: ClientMeta,
    res: Response
  ): Promise<AuthResponseDto> {
    const profile = await this.googleVerifier.verify(dto.credential);

    const existing = await this.usersRepository.findByEmail(profile.email);
    if (existing) {
      this.assertNotSuspended(existing);
      await this.usersRepository.update(existing.id, {
        oauthMetadata: this.toOauthMetadata(profile),
        ...(profile.emailVerified ? { emailIsVerified: true } : {}),
        ...(existing.avatar === null && profile.picture !== null
          ? { avatar: profile.picture }
          : {}),
      });
      return this.issueSession(existing.id, meta, res);
    }

    const created = await this.usersRepository.insert({
      email: profile.email,
      name: profile.name,
      password: null,
      avatar: profile.picture,
      emailIsVerified: profile.emailVerified,
      oauthMetadata: this.toOauthMetadata(profile),
    });
    return this.issueSession(created.id, meta, res);
  }

  /** Logout sesi ini saja (token dari header/cookie) + hapus cookie. */
  async logout(sessionToken: string, res: Response): Promise<void> {
    await this.sessionsService.revoke(sessionToken);
    // No-op aman bagi client Bearer yang tidak punya cookie.
    res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS);
  }

  /** Logout seluruh perangkat + hapus cookie perangkat ini. */
  async logoutAll(userId: string, res: Response): Promise<void> {
    await this.sessionsService.revokeAll(userId);
    res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS);
  }

  async me(userId: string): Promise<AuthResponseDto['user']> {
    return this.usersService.findById(userId);
  }

  async listSessions(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionsService.getUserSessions(userId);
    return sessions.map(
      (session) =>
        new SessionResponseDto({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          lastActivityAt: session.lastActivityAt,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        })
    );
  }

  // ---------- helpers ----------

  /**
   * Terbitkan sesi + catat lastLoginAt, lalu bungkus response auth.
   * Token dikirim lewat DUA transport sekaligus: body (mobile/desktop —
   * disimpan di Keychain/Keystore) dan cookie httpOnly (web — tahan XSS,
   * auto-terkirim saat refresh). Tanpa deteksi platform: client yang tidak
   * memakai cookie tidak terpengaruh.
   */
  private async issueSession(
    userId: string,
    meta: ClientMeta,
    res: Response
  ): Promise<AuthResponseDto> {
    const { session, token } = await this.sessionsService.create({
      userId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    await this.usersRepository.update(userId, { lastLoginAt: new Date() });

    res.cookie(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions(session.expiresAt)
    );

    return new AuthResponseDto({
      token,
      expiresAt: session.expiresAt,
      user: await this.usersService.findById(userId),
    });
  }

  private assertNotSuspended(user: SelectUser): void {
    if (user.status === 'suspended') {
      throw UserSuspendedException({ details: { userId: user.id } });
    }
  }

  private toOauthMetadata(profile: GoogleProfile): {
    provider: string;
    emailVerified: boolean;
    picture?: string;
    locale?: string;
  } {
    return {
      provider: 'google',
      emailVerified: profile.emailVerified,
      ...(profile.picture !== null ? { picture: profile.picture } : {}),
      ...(profile.locale !== null ? { locale: profile.locale } : {}),
    };
  }
}
