import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVariantDTO {
  /**
   * SKU internal opsional (override manual). Bila kosong, auto-generate dari
   * singkatan brand/category/attribute. Hanya huruf/angka/dash, uppercase.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'skuCode hanya boleh huruf, angka, dan tanda hubung',
  })
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  skuCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  variantName?: string;

  /** Harga dalam Rupiah penuh. */
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  // Stok TIDAK di-set di sini — per-outlet via PUT /outlets/:id/inventory/:variantId.

  /** Berat dalam gram. */
  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** Daftar attribute_value id yang membentuk variant (mis. [Red, 42]). */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  attributeValueIds: number[];

  /**
   * Daftar id product_media yang di-link ke variant (gambar existing atau hasil
   * upload sebelumnya). Harus milik product yang sama.
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  mediaIds?: number[];
}
