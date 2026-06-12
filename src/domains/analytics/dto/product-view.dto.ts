import { IsInt, IsOptional, Min } from 'class-validator';

/** Event view halaman produk — dikirim FE saat halaman produk dibuka. */
export class ProductViewDTO {
  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;
}
