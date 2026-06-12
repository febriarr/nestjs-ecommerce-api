import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { RangeQueryDTO } from './range-query.dto';

export const BEST_SELLER_SORTS = ['quantity', 'revenue'] as const;
export type BestSellerSort = (typeof BEST_SELLER_SORTS)[number];

export class BestSellersQueryDTO extends RangeQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(BEST_SELLER_SORTS)
  sort?: BestSellerSort;
}
