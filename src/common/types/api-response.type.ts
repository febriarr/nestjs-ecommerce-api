export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  nextCursor?: string;
  prevCursor?: string;
}
export interface ApiSuccessResponse<T> {
  ok: boolean;
  data: T;
  metadata?: PaginationMeta | Record<string, unknown>;
}

export interface WithMetadata<T> {
  data: T;
  metadata: PaginationMeta | Record<string, unknown>;
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
