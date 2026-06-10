import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Field tambahan saat upload media (multipart, bersama file `image`). */
export class AddProductMediaDTO {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAlt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
