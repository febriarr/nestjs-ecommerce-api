import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import {
  AuthGoogleExchangeFailedException,
  AuthGoogleProfileInvalidException,
} from '../../common/exceptions/domains/auth.exceptions';

/**
 * Injection token untuk abstraction GoogleTokenVerifier (pola PAYMENT_GATEWAY)
 * — service hanya bergantung pada interface; test cukup mock verifier.
 */
export const GOOGLE_TOKEN_VERIFIER = 'GOOGLE_TOKEN_VERIFIER' as const;

/** Profil ternormalisasi hasil verifikasi ID token Google. */
export interface GoogleProfile {
  /** Subject Google (id akun, stabil). */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
  locale: string | null;
}

export interface GoogleTokenVerifier {
  /** Verifikasi `credential` (ID token JWT dari GIS) dan kembalikan profilnya. */
  verify(credential: string): Promise<GoogleProfile>;
}

/**
 * Verifikasi ID token dari Google Identity Services (GIS): frontend memanggil
 * GIS → menerima `credential` → kirim ke POST /auth/google. Library resmi
 * memvalidasi signature (JWKS Google), expiry, issuer, dan audience —
 * audience harus sama dengan GOOGLE_CLIENT_ID yang dipakai FE.
 *
 * Client id dibaca saat dipakai (bukan constructor) agar boot tidak gagal
 * bila env belum di-set — pola sama dengan CompanyConfigService.
 */
@Injectable()
export class GoogleIdTokenVerifier implements GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verify(credential: string): Promise<GoogleProfile> {
    const audience = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw AuthGoogleExchangeFailedException({ cause: error });
    }

    if (!payload || !payload.sub || !payload.email) {
      throw AuthGoogleProfileInvalidException({
        details: { reason: 'sub/email tidak tersedia pada token' },
      });
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified ?? false,
      name: payload.name ?? payload.email.split('@')[0],
      picture: payload.picture ?? null,
      locale: payload.locale ?? null,
    };
  }
}
