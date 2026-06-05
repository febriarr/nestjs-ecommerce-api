import { HttpException } from '@nestjs/common';
import { AppExceptionInit, IAppException } from '../types/exceptions.type';
import { ApiErrorPayload, ErrorCategory } from '../types/api-response.type';

export class AppException extends HttpException implements IAppException {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly details: Record<string, unknown> | null;
  readonly fields: Record<string, string[]> | null;
  readonly cause: unknown;

  constructor(init: AppExceptionInit) {
    super(
      {
        code: init.code,
        category: init.category,
        message: init.message,
        details: init.details ?? null,
        fields: init.fields ?? null,
      } satisfies Omit<ApiErrorPayload, 'requestId'>,
      init.status
    );
    this.code = init.code;
    this.category = init.category;
    this.details = init.details ?? null;
    this.fields = init.fields ?? null;
    this.cause = init.cause;
  }
}

// Helper for inherited domain - for not repeating init shape
export function defineAppError(
  defaults: Omit<AppExceptionInit, 'details' | 'fields' | 'cause'>
) {
  return function (
    overrides: Partial<
      Pick<AppExceptionInit, 'message' | 'details' | 'fields' | 'cause'>
    > = {}
  ): AppException {
    return new AppException({
      ...defaults,
      ...overrides,
      message: overrides.message ?? defaults.message,
    });
  };
}
