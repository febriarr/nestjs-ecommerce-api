import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
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

/** Pembuat transfer diambil dari user login (@CurrentUser), bukan body. */
export class CreateTransferDTO {
  @IsInt()
  @Min(1)
  fromOutletId: number;

  @IsInt()
  @Min(1)
  toOutletId: number;

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
