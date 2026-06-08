import { HttpStatus } from '@nestjs/common';
import { defineAppError } from '../app-exceptions';
import { ERROR_CODES } from '../error-codes.constant';

export const ImageInvalidException = defineAppError({
  code: ERROR_CODES.IMAGE_INVALID,
  category: 'MEDIA',
  message: 'File gambar tidak valid atau rusak.',
  status: HttpStatus.UNPROCESSABLE_ENTITY,
});

export const ImageUnsupportedTypeException = defineAppError({
  code: ERROR_CODES.IMAGE_UNSUPPORTED_TYPE,
  category: 'MEDIA',
  message: 'Tipe gambar tidak didukung.',
  status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
});
