import { IsInt, IsOptional, Min } from 'class-validator';

export class AddVariantMediaDTO {
  /** id product_media (harus milik product yang sama dengan variant). */
  @IsInt()
  mediaId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
