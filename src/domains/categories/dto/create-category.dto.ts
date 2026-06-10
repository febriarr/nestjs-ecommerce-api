import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Gambar di-upload sebagai file (multipart field `image`), bukan string body.

  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: string | number }) =>
    value === undefined || value === '' ? undefined : Number(value)
  )
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
