import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ValidationError } from 'class-validator';
import type { Request, Response } from 'express';
import { ApiErrorResponse, ErrorCategory } from '../types/api-response.type';
import { AppException } from '../exceptions/app-exceptions';
import { ERROR_CODES } from '../exceptions/error-codes.constant';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    const payload = this.toErrorResponse(exception, req);
    res.status(payload.__status).json(payload.body);
  }

  private toErrorResponse(
    exception: unknown,
    req: Request & { id?: string }
  ): { __status: number; body: ApiErrorResponse } {
    const requestId = req.id ?? null;
    const path = req.url;
    const timestamp = new Date().toISOString();

    // 1. Custom domain exception
    if (exception instanceof AppException) {
      if (exception.getStatus() >= 500) {
        this.logger.error(
          `[${exception.code}] ${exception.message}`,
          exception.cause instanceof Error ? exception.cause.stack : undefined
        );
      }
      return {
        __status: exception.getStatus(),
        body: {
          ok: false,
          error: {
            code: exception.code,
            category: exception.category,
            message: exception.message,
            details: exception.details,
            fields: exception.fields,
            requestId,
          },
          path,
          timestamp,
        },
      };
    }

    // 2. class-validator error (dari ValidationPipe)
    if (this.isValidationErrorArray(exception)) {
      return {
        __status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: {
          ok: false,
          error: {
            code: ERROR_CODES.VALIDATION_FAILED,
            category: 'VALIDATION',
            message: 'Input tidak valid.',
            details: null,
            fields: this.extractValidationFields(exception),
            requestId,
          },
          path,
          timestamp,
        },
      };
    }

    // 3. Throttler
    if (exception instanceof ThrottlerException) {
      return {
        __status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          ok: false,
          error: {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            category: 'RATE_LIMIT',
            message: 'Terlalu banyak request. Coba lagi sebentar.',
            details: null,
            fields: null,
            requestId,
          },
          path,
          timestamp,
        },
      };
    }

    // 4. Generic HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse() as
        | string
        | { message?: string | string[] };
      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw.message)
            ? raw.message.join(', ')
            : (raw.message ?? exception.message);
      return {
        __status: status,
        body: {
          ok: false,
          error: {
            code: this.statusToCode(status),
            category: this.statusToCategory(status),
            message,
            details: null,
            fields: null,
            requestId,
          },
          path,
          timestamp,
        },
      };
    }

    // 5. Unknown — log + opaque 500
    if (exception instanceof Error) {
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unhandled non-Error throw: ${String(exception)}`);
    }

    return {
      __status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        ok: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          category: 'INTERNAL',
          message: 'Terjadi kesalahan internal. Tim kami sudah dinotifikasi.',
          details: null,
          fields: null,
          requestId,
        },
        path,
        timestamp,
      },
    };
  }

  private isValidationErrorArray(value: unknown): value is ValidationError[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value[0] instanceof ValidationError
    );
  }

  private extractValidationFields(
    errors: ValidationError[],
    parentPath = ''
  ): Record<string, string[]> {
    return errors.reduce<Record<string, string[]>>((acc, error) => {
      const field = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.children && error.children.length > 0) {
        Object.assign(acc, this.extractValidationFields(error.children, field));
      } else {
        acc[field] = error.constraints ? Object.values(error.constraints) : [];
      }

      return acc;
    }, {});
  }

  private statusToCode(status: number): string {
    if (status === 404) return ERROR_CODES.NOT_FOUND;
    if (status === 409) return ERROR_CODES.CONFLICT;
    if (status === 403) return ERROR_CODES.FORBIDDEN;
    if (status === 401) return ERROR_CODES.AUTH_TOKEN_INVALID;
    if (status === 422) return ERROR_CODES.VALIDATION_FAILED;
    if (status === 429) return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    return ERROR_CODES.INTERNAL_ERROR;
  }

  private statusToCategory(status: number): ErrorCategory {
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 403) return 'PERMISSION';
    if (status === 401) return 'AUTH';
    if (status === 422) return 'VALIDATION';
    if (status === 429) return 'RATE_LIMIT';
    return 'INTERNAL';
  }
}
