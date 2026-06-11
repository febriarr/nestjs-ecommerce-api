import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePoItemDTO {
  @IsOptional()
  @IsInt()
  @Min(1)
  qtyOrdered?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCost?: number;
}
