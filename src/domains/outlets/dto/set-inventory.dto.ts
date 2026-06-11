import { IsInt, Min } from 'class-validator';

/** Set stok absolut sebuah variant pada sebuah outlet (upsert). */
export class SetInventoryDTO {
  @IsInt()
  @Min(0)
  stock: number;
}
