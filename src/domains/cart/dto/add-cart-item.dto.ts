import { IsInt, Min } from 'class-validator';

export class AddCartItemDTO {
  @IsInt()
  @Min(1)
  variantId: number;

  /** Jumlah yang DITAMBAHKAN (bila item sudah ada, qty diakumulasi). */
  @IsInt()
  @Min(1)
  quantity: number;
}
