import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import { productStatusEnum } from '../../../infrastructure/database/schema';

export class ProductQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @IsIn(productStatusEnum.enumValues)
  status?: (typeof productStatusEnum.enumValues)[number];

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  brandId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
