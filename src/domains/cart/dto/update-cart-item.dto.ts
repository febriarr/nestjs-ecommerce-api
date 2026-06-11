import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDTO {
  /** Jumlah absolut yang diinginkan (bukan delta). */
  @IsInt()
  @Min(1)
  quantity: number;
}
