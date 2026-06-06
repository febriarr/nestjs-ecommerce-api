import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const OtpInvalidException = defineAppError({
  code: ERROR_CODES.AUTH_OTP_INVALID,
  category: 'AUTH',
  message: 'Kode OTP tidak valid.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OtpExpiredException = defineAppError({
  code: ERROR_CODES.AUTH_OTP_EXPIRED,
  category: 'AUTH',
  message: 'Kode OTP telah kedaluwarsa.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OtpRateLimitedException = defineAppError({
  code: ERROR_CODES.AUTH_OTP_RATE_LIMITED,
  category: 'RATE_LIMIT',
  message: 'Terlalu banyak permintaan OTP. Coba lagi beberapa saat.',
  status: HttpStatus.TOO_MANY_REQUESTS,
});

export const OtpMaxAttemptsException = defineAppError({
  code: ERROR_CODES.AUTH_OTP_MAX_ATTEMPTS,
  category: 'AUTH',
  message: 'Batas percobaan OTP telah tercapai. Silakan request OTP baru.',
  status: HttpStatus.FORBIDDEN,
});

export const OtpPurposeMismatchException = defineAppError({
  code: ERROR_CODES.AUTH_OTP_PURPOSE_MISMATCH,
  category: 'AUTH',
  message: 'OTP tidak sesuai dengan tujuan yang diminta.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
