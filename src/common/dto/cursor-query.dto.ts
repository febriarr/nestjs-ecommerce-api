import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Batas default & maksimum item per halaman. */
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * Query dasar untuk cursor pagination (keyset, tanpa count).
 * Diturunkan oleh query DTO spesifik domain.
 */
export class CursorQueryDTO {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;
}
