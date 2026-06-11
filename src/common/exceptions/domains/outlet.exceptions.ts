import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const OutletNotFoundException = defineAppError({
  code: ERROR_CODES.OUTLET_NOT_FOUND,
  category: 'OUTLET',
  message: 'Outlet tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const OutletCodeConflictException = defineAppError({
  code: ERROR_CODES.OUTLET_CODE_CONFLICT,
  category: 'OUTLET',
  message: 'Kode outlet sudah digunakan.',
  status: HttpStatus.CONFLICT,
});

export const OutletInactiveException = defineAppError({
  code: ERROR_CODES.OUTLET_INACTIVE,
  category: 'OUTLET',
  message: 'Outlet tidak aktif.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OutletInventoryNotFoundException = defineAppError({
  code: ERROR_CODES.OUTLET_INVENTORY_NOT_FOUND,
  category: 'OUTLET',
  message: 'Inventori variant pada outlet ini tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const OutletInventoryInvalidException = defineAppError({
  code: ERROR_CODES.OUTLET_INVENTORY_INVALID,
  category: 'OUTLET',
  message:
    'Nilai stok tidak valid (tidak boleh lebih kecil dari stok yang sedang direservasi).',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
