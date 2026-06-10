import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const ProductMediaNotFoundException = defineAppError({
  code: ERROR_CODES.PRODUCT_MEDIA_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Media produk tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const MediaNotOwnedByProductException = defineAppError({
  code: ERROR_CODES.PRODUCT_MEDIA_NOT_OWNED,
  category: 'PRODUCT',
  message: 'Media tidak dimiliki oleh produk ini.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
