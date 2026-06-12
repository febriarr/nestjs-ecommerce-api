import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PoItemInputDTO } from './po-item-input.dto';

/** Pembuat PO diambil dari user login (@CurrentUser), bukan body. */
export class CreatePurchaseOrderDTO {
  @IsInt()
  @Min(1)
  supplierId: number;

  /** Outlet tujuan penerimaan barang. */
  @IsInt()
  @Min(1)
  outletId: number;

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
