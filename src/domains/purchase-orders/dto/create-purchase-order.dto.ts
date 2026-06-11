import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PoItemInputDTO } from './po-item-input.dto';

export class CreatePurchaseOrderDTO {
  @IsInt()
  @Min(1)
  supplierId: number;

  /** Outlet tujuan penerimaan barang. */
  @IsInt()
  @Min(1)
  outletId: number;

  /** Admin pembuat (belum ada auth guard — konvensi products.createdBy). */
  @IsUUID()
  createdBy: string;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** Item boleh diisi langsung saat create; bisa juga ditambah saat DRAFT. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemInputDTO)
  items?: PoItemInputDTO[];
}
