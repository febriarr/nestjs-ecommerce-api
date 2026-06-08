import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const StorageObjectNotFoundException = defineAppError({
  code: ERROR_CODES.STORAGE_OBJECT_NOT_FOUND,
  category: 'STORAGE',
  message: 'Objek tidak ditemukan di storage.',
  status: HttpStatus.NOT_FOUND,
});

export const StorageObjectStreamException = defineAppError({
  code: ERROR_CODES.STORAGE_OBJECT_UNREADABLE,
  category: 'STORAGE',
  message: 'Objek storage tidak dapat dibaca sebagai stream.',
  status: HttpStatus.INTERNAL_SERVER_ERROR,
});
