import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const DiscountNotFoundException = defineAppError({
  code: ERROR_CODES.DISCOUNT_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Diskon tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const DiscountInvalidException = defineAppError({
  code: ERROR_CODES.DISCOUNT_INVALID,
  category: 'PRODUCT',
  message: 'Konfigurasi diskon tidak valid.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
