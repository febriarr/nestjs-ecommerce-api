import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const SupplierNotFoundException = defineAppError({
  code: ERROR_CODES.SUPPLIER_NOT_FOUND,
  category: 'PURCHASING',
  message: 'Supplier tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const SupplierCodeConflictException = defineAppError({
  code: ERROR_CODES.SUPPLIER_CODE_CONFLICT,
  category: 'PURCHASING',
  message: 'Kode supplier sudah digunakan.',
  status: HttpStatus.CONFLICT,
});
