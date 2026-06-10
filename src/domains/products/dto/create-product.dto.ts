import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { productStatusEnum } from '../../../infrastructure/database/schema';

export class CreateProductDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsInt()
  brandId?: number;

  @IsOptional()
  @IsIn(productStatusEnum.enumValues)
  status?: (typeof productStatusEnum.enumValues)[number];

  // Interim: nanti diisi dari user terautentikasi (req.user) saat auth guard dipasang.
  @IsUUID()
  createdBy: string;
}
