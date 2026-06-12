import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const UserNotFoundException = defineAppError({
  code: ERROR_CODES.USER_NOT_FOUND,
  category: 'USER',
  message: 'User tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const UserSuspendedException = defineAppError({
  code: ERROR_CODES.USER_SUSPENDED,
  category: 'USER',
  message: 'Akun Anda sedang ditangguhkan. Hubungi admin.',
  status: HttpStatus.FORBIDDEN,
});

export const UserEmailConflictException = defineAppError({
  code: ERROR_CODES.USER_EMAIL_CONFLICT,
  category: 'USER',
  message: 'Email sudah terdaftar.',
  status: HttpStatus.CONFLICT,
});

export const UserInvalidPasswordException = defineAppError({
  code: ERROR_CODES.USER_INVALID_PASSWORD,
  category: 'USER',
  message: 'Password saat ini tidak cocok.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const UserContactNotFoundException = defineAppError({
  code: ERROR_CODES.USER_CONTACT_NOT_FOUND,
  category: 'USER',
  message: 'Alamat tidak ditemukan atau bukan milik user ini.',
  status: HttpStatus.NOT_FOUND,
});
