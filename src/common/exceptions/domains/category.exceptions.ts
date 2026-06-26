import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const CategoryNotFoundException = defineAppError({
  code: ERROR_CODES.CATEGORY_NOT_FOUND,
  category: 'CATEGORY',
  message: 'Kategori tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const CategorySlugConflictException = defineAppError({
  code: ERROR_CODES.CATEGORY_SLUG_TAKEN,
  category: 'CATEGORY',
  message: 'Slug kategori sudah digunakan.',
  status: HttpStatus.CONFLICT,
});

export const CategoryReorderLevelMismatchException = defineAppError({
  code: ERROR_CODES.CATEGORY_REORDER_LEVEL_MISMATCH,
  category: 'CATEGORY',
  message: 'Kategori harus berada dalam level yang sama untuk ditukar.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
