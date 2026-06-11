import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const PaymentNotFoundException = defineAppError({
  code: ERROR_CODES.PAYMENT_NOT_FOUND,
  category: 'PAYMENT',
  message: 'Pembayaran tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const PaymentSignatureInvalidException = defineAppError({
  code: ERROR_CODES.PAYMENT_SIGNATURE_INVALID,
  category: 'PAYMENT',
  message: 'Signature webhook pembayaran tidak valid.',
  status: HttpStatus.UNAUTHORIZED,
});

export const PaymentOrderNotPayableException = defineAppError({
  code: ERROR_CODES.PAYMENT_ORDER_NOT_PAYABLE,
  category: 'PAYMENT',
  message: 'Order tidak dalam status yang dapat dibayar.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const PaymentAmountMismatchException = defineAppError({
  code: ERROR_CODES.PAYMENT_AMOUNT_MISMATCH,
  category: 'PAYMENT',
  message: 'Nominal pembayaran tidak sesuai dengan total order.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const PaymentProviderUnsupportedException = defineAppError({
  code: ERROR_CODES.PAYMENT_PROVIDER_UNSUPPORTED,
  category: 'PAYMENT',
  message: 'Provider pembayaran tidak dikenal.',
  status: HttpStatus.NOT_FOUND,
});
