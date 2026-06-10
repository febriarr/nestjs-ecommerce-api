import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const AttributeNotFoundException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_NOT_FOUND,
  category: 'ATTRIBUTE',
  message: 'Attribute tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const AttributeNameConflictException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_NAME_CONFLICT,
  category: 'ATTRIBUTE',
  message: 'Nama attribute sudah digunakan.',
  status: HttpStatus.CONFLICT,
});

export const AttributeValueNotFoundException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_VALUE_NOT_FOUND,
  category: 'ATTRIBUTE',
  message: 'Attribute value tidak ditemukan.',
  status: HttpStatus.NOT_FOUND,
});

export const AttributeValueConflictException = defineAppError({
  code: ERROR_CODES.ATTRIBUTE_VALUE_CONFLICT,
  category: 'ATTRIBUTE',
  message: 'Value sudah ada pada attribute ini.',
  status: HttpStatus.CONFLICT,
});
