import { IsIn, IsOptional } from 'class-validator';
import { RangeQueryDTO } from './range-query.dto';

export const SERIES_INTERVALS = ['day', 'week', 'month'] as const;
export type SeriesInterval = (typeof SERIES_INTERVALS)[number];

export class SeriesQueryDTO extends RangeQueryDTO {
  @IsOptional()
  @IsIn(SERIES_INTERVALS)
  interval?: SeriesInterval;
}
