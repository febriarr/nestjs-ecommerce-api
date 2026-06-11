import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TransferItemDTO {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateTransferDTO {
  @IsInt()
  @Min(1)
  fromOutletId: number;

  @IsInt()
  @Min(1)
  toOutletId: number;

  /** Admin pembuat (belum ada auth guard — konvensi products.createdBy). */
  @IsUUID()
  createdBy: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDTO)
  items: TransferItemDTO[];
}
