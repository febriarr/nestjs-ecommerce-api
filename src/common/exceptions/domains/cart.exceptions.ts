import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const CartNotFoundException = defineAppError({
  code: ERROR_CODES.CART_NOT_FOUND,
  category: 'CART',
  message: 'Cart tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const CartEmptyException = defineAppError({
  code: ERROR_CODES.CART_EMPTY,
  category: 'CART',
  message: 'Cart masih kosong.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const CartOutletNotSetException = defineAppError({
  code: ERROR_CODES.CART_OUTLET_NOT_SET,
  category: 'CART',
  message: 'Outlet belum dipilih untuk cart ini.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const CartItemNotFoundException = defineAppError({
  code: ERROR_CODES.CART_ITEM_NOT_FOUND,
  category: 'CART',
  message: 'Item tidak ditemukan di cart.',
  status: HttpStatus.NOT_FOUND,
});

export const CartStockInsufficientException = defineAppError({
  code: ERROR_CODES.CART_STOCK_INSUFFICIENT,
  category: 'CART',
  message: 'Stok outlet tidak mencukupi untuk jumlah yang diminta.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});
