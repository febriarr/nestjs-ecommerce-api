import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AlertsQueryDTO {
  /** Ambang low stock: 0 < available ≤ threshold (default 5). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  threshold?: number;

  /** Batasi ke satu outlet (default: semua outlet). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId?: number;
}
