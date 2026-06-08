import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const BrandNotFoundException = defineAppError({
  code: ERROR_CODES.BRAND_NOT_FOUND,
  category: 'NOT_FOUND',
  message: 'Brand tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});
