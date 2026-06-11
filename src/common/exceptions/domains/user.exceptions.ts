import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const UserNotFoundException = defineAppError({
  code: ERROR_CODES.USER_NOT_FOUND,
  category: 'USER',
  message: 'User tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});
