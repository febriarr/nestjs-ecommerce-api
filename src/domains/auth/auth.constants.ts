import type { CookieOptions } from 'express';

/**
 * Transport kedua untuk session token: cookie httpOnly (web client) —
 * berdampingan dengan Bearer header (mobile/desktop). Token & mekanisme
 * sesi (hash, expiry, revoke) tidak berubah; ini murni soal pengiriman.
 */
export const SESSION_COOKIE_NAME = 'sessionToken' as const;

/** Opsi set-cookie saat sesi terbit; maxAge mengikuti expiry sesi yang ada. */
export function buildSessionCookieOptions(expiresAt: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  };
}

/** Opsi clearCookie — harus cocok path-nya agar browser benar-benar menghapus. */
export const CLEAR_SESSION_COOKIE_OPTIONS: CookieOptions = { path: '/' };
