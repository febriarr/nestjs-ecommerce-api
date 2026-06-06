import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const SessionNotFoundException = defineAppError({
  code: ERROR_CODES.AUTH_SESSION_NOT_FOUND,
  category: 'AUTH',
  message: 'Sesi tidak ditemukan.',
  status: HttpStatus.UNAUTHORIZED,
});

export const SessionRevokedException = defineAppError({
  code: ERROR_CODES.AUTH_SESSION_REVOKED,
  category: 'AUTH',
  message: 'Sesi telah berakhir. Silakan login kembali.',
  status: HttpStatus.UNAUTHORIZED,
});

export const SessionTheftDetectedException = defineAppError({
  code: ERROR_CODES.AUTH_SESSION_THEFT_DETECTED,
  category: 'AUTH',
  message: 'Aktivitas mencurigakan terdeteksi. Semua sesi telah dicabut.',
  status: HttpStatus.UNAUTHORIZED,
});
