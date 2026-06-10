import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const InvoiceNotFoundException = defineAppError({
  code: ERROR_CODES.INVOICE_NOT_FOUND,
  category: 'INVOICE',
  message: 'Invoice tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const InvoicePdfGenerationFailedException = defineAppError({
  code: ERROR_CODES.INVOICE_PDF_GENERATION_FAILED,
  category: 'INVOICE',
  message: 'Gagal membuat PDF invoice.',
  status: HttpStatus.INTERNAL_SERVER_ERROR,
});

export const InvoiceInvalidStatusTransitionException = defineAppError({
  code: ERROR_CODES.INVOICE_INVALID_STATUS_TRANSITION,
  category: 'INVOICE',
  message: 'Perubahan status invoice tidak diperbolehkan.',
  status: HttpStatus.CONFLICT,
});

export const InvoiceInvalidPaymentException = defineAppError({
  code: ERROR_CODES.INVOICE_INVALID_PAYMENT,
  category: 'INVOICE',
  message: 'Nominal pembayaran tidak sesuai dengan status yang diminta.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
