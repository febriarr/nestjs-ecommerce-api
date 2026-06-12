import { IsDateString, IsOptional } from 'class-validator';

/** Rentang waktu analitik; default 30 hari terakhir (di-resolve service). */
export class RangeQueryDTO {
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Eksklusif (data < to). */
  @IsOptional()
  @IsDateString()
  to?: string;
}
