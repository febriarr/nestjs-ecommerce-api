import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { discountTypeEnum } from '../../../infrastructure/database/schema';

export class CreateDiscountDTO {
  @IsIn(discountTypeEnum.enumValues)
  type: (typeof discountTypeEnum.enumValues)[number];

  /** Wajib bila type PERCENTAGE (0..100). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  /** Wajib bila type FIXED (Rupiah). */
  @IsOptional()
  @IsInt()
  @Min(0)
  fixedAmount?: number;

  /** Batas potongan (hanya PERCENTAGE). */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
