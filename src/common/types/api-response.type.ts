export interface ApiSuccessResponse<T> {
  ok: boolean;
  data: T;
}

export interface ApiErrorPayload {
  code: string;
  category: ErrorCategory;
  message: string;
  details: Record<string, unknown> | null;
  fields: Record<string, string[]> | null;
  requestId: string | null;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiErrorPayload;
  path: string;
  timestamp: string;
}

export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTH'
  | 'INTERNAL'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CATEGORY'
  | 'PAYMENT'
  | 'USER'
  | 'PERMISSION'
  | 'RATE_LIMIT';
