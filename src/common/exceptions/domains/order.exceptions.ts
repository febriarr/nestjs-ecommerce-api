import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const OrderNotFoundException = defineAppError({
  code: ERROR_CODES.ORDER_NOT_FOUND,
  category: 'ORDER',
  message: 'Order tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

/**
 * Kebijakan A: tidak ada satu outlet pun yang sanggup memenuhi SEMUA item.
 * `details` memuat ketersediaan per item agar user bisa menyesuaikan qty,
 * menghapus item, atau memilih outlet lain.
 */
export const OrderUnfulfillableException = defineAppError({
  code: ERROR_CODES.ORDER_UNFULFILLABLE,
  category: 'ORDER',
  message:
    'Tidak ada outlet yang dapat memenuhi seluruh item. Sesuaikan jumlah, hapus item yang tidak tersedia, atau pilih outlet lain.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OrderOutletNotEligibleException = defineAppError({
  code: ERROR_CODES.ORDER_OUTLET_NOT_ELIGIBLE,
  category: 'ORDER',
  message:
    'Outlet yang dipilih tidak dapat melayani order ini (tidak aktif, tidak melayani online, atau stok tidak mencukupi).',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OrderContactNotFoundException = defineAppError({
  code: ERROR_CODES.ORDER_CONTACT_NOT_FOUND,
  category: 'ORDER',
  message: 'Alamat pengiriman tidak ditemukan atau bukan milik user ini.',
  status: HttpStatus.NOT_FOUND,
});

export const OrderInvalidStatusTransitionException = defineAppError({
  code: ERROR_CODES.ORDER_INVALID_STATUS_TRANSITION,
  category: 'ORDER',
  message: 'Transisi status order tidak diperbolehkan.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const OrderIdempotencyKeyMissingException = defineAppError({
  code: ERROR_CODES.IDEMPOTENCY_KEY_MISSING,
  category: 'ORDER',
  message:
    'Header Idempotency-Key wajib untuk checkout (cegah order ganda saat retry).',
  status: HttpStatus.BAD_REQUEST,
});

export const OrderIdempotencyConflictException = defineAppError({
  code: ERROR_CODES.IDEMPOTENCY_CONFLICT,
  category: 'ORDER',
  message:
    'Request dengan Idempotency-Key yang sama sedang diproses. Tunggu sebentar lalu coba lagi.',
  status: HttpStatus.CONFLICT,
});

export const OrderStockReservationFailedException = defineAppError({
  code: ERROR_CODES.ORDER_STOCK_RESERVATION_FAILED,
  category: 'ORDER',
  message:
    'Reservasi stok gagal — stok berubah saat checkout. Silakan coba lagi.',
  status: HttpStatus.CONFLICT,
});
