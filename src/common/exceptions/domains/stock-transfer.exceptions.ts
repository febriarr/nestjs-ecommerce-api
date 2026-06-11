import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const TransferNotFoundException = defineAppError({
  code: ERROR_CODES.TRANSFER_NOT_FOUND,
  category: 'TRANSFER',
  message: 'Transfer stok tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const TransferInvalidStatusException = defineAppError({
  code: ERROR_CODES.TRANSFER_INVALID_STATUS,
  category: 'TRANSFER',
  message: 'Aksi tidak diperbolehkan pada status transfer saat ini.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const TransferSameOutletException = defineAppError({
  code: ERROR_CODES.TRANSFER_SAME_OUTLET,
  category: 'TRANSFER',
  message: 'Outlet asal dan tujuan transfer tidak boleh sama.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const TransferItemInvalidException = defineAppError({
  code: ERROR_CODES.TRANSFER_ITEM_INVALID,
  category: 'TRANSFER',
  message: 'Item transfer tidak valid (variant tidak dikenal atau duplikat).',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const TransferStockInsufficientException = defineAppError({
  code: ERROR_CODES.TRANSFER_STOCK_INSUFFICIENT,
  category: 'TRANSFER',
  message: 'Stok tersedia di outlet asal tidak mencukupi untuk transfer ini.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
