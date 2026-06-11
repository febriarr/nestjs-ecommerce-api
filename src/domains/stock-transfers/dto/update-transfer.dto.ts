import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TransferItemDTO } from './create-transfer.dto';

/** Update transfer — hanya DRAFT; `items` (bila dikirim) MENGGANTI seluruh item. */
export class UpdateTransferDTO {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDTO)
  items?: TransferItemDTO[];
}
