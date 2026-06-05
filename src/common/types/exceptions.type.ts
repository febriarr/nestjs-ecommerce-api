import { HttpStatus } from '@nestjs/common';
import { ErrorCategory } from './api-response.type';

export interface IAppException {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly details: Record<string, unknown> | null;
  readonly fields: Record<string, string[]> | null;
  cause: unknown;
}

export interface AppExceptionInit {
  code: string;
  category: ErrorCategory;
  status: HttpStatus;
  message: string;
  details?: Record<string, unknown> | null;
  fields?: Record<string, string[]> | null;
  cause?: unknown;
}
