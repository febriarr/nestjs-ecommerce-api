import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const PurchaseOrderNotFoundException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_NOT_FOUND,
  category: 'PURCHASING',
  message: 'Purchase order tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const PurchaseOrderInvalidStatusException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_INVALID_STATUS,
  category: 'PURCHASING',
  message: 'Aksi tidak diperbolehkan pada status purchase order saat ini.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const PurchaseOrderEmptyException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_EMPTY,
  category: 'PURCHASING',
  message: 'Purchase order belum memiliki item.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const PurchaseOrderItemNotFoundException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_ITEM_NOT_FOUND,
  category: 'PURCHASING',
  message: 'Item purchase order tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const PurchaseOrderItemConflictException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_ITEM_CONFLICT,
  category: 'PURCHASING',
  message: 'Variant sudah ada di purchase order ini.',
  status: HttpStatus.CONFLICT,
});

export const PurchaseOrderReceiptInvalidException = defineAppError({
  code: ERROR_CODES.PURCHASE_ORDER_RECEIPT_INVALID,
  category: 'PURCHASING',
  message: 'Payload penerimaan barang tidak valid.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
