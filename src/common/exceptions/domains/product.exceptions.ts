import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const ProductNotFoundException = defineAppError({
  code: ERROR_CODES.PRODUCT_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Produk tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const ProductSlugConflictException = defineAppError({
  code: ERROR_CODES.PRODUCT_SLUG_CONFLICT,
  category: 'PRODUCT',
  message: 'Slug produk sudah digunakan.',
  status: HttpStatus.CONFLICT,
});

export const CategoryNotFoundException = defineAppError({
  code: ERROR_CODES.CATEGORY_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Kategori tidak ditemukan.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const AttributeNotFoundException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Attribute tidak ditemukan.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const AttributeValueNotFoundException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_VALUE_NOT_FOUND,
  category: 'PRODUCT',
  message: 'Attribute value tidak ditemukan.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
