import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const VariantNotFoundException = defineAppError({
  code: ERROR_CODES.VARIANT_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Variant produk tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const VariantSkuConflictException = defineAppError({
  code: ERROR_CODES.VARIANT_SKU_CONFLICT,
  category: 'PRODUCT',
  message: 'SKU variant sudah digunakan.',
  status: HttpStatus.CONFLICT,
});

export const VariantAttributeInvalidException = defineAppError({
  code: ERROR_CODES.VARIANT_ATTRIBUTE_INVALID,
  category: 'PRODUCT',
  message:
    'Kombinasi attribute variant tidak valid (attribute tidak dideklarasikan produk, duplikat, atau value tidak dikenal).',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
