import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

/** Pesan sengaja sama untuk email tak terdaftar & password salah (anti enumerasi). */
export const AuthInvalidCredentialsException = defineAppError({
  code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  category: 'AUTH',
  message: 'Email atau password salah.',
  status: HttpStatus.UNAUTHORIZED,
});

export const AuthTokenMissingException = defineAppError({
  code: ERROR_CODES.AUTH_TOKEN_MISSING,
  category: 'AUTH',
  message: 'Token autentikasi tidak ditemukan.',
  status: HttpStatus.UNAUTHORIZED,
});

export const AuthTokenInvalidException = defineAppError({
  code: ERROR_CODES.AUTH_TOKEN_INVALID,
  category: 'AUTH',
  message: 'Token autentikasi tidak valid.',
  status: HttpStatus.UNAUTHORIZED,
});

export const AuthGoogleExchangeFailedException = defineAppError({
  code: ERROR_CODES.AUTH_GOOGLE_EXCHANGE_FAILED,
  category: 'AUTH',
  message: 'Verifikasi token Google gagal.',
  status: HttpStatus.UNAUTHORIZED,
});

export const AuthGoogleProfileInvalidException = defineAppError({
  code: ERROR_CODES.AUTH_GOOGLE_PROFILE_INVALID,
  category: 'AUTH',
  message: 'Profil Google tidak lengkap (email tidak tersedia).',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const AuthForbiddenException = defineAppError({
  code: ERROR_CODES.FORBIDDEN,
  category: 'PERMISSION',
  message: 'Anda tidak memiliki akses untuk aksi ini.',
  status: HttpStatus.FORBIDDEN,
});
