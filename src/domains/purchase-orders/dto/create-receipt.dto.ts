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

export class ReceiptItemDTO {
  @IsInt()
  @Min(1)
  poItemId: number;

  /** Qty datang — boleh melebihi sisa pesanan (ditandai overReceived). */
  @IsInt()
  @Min(1)
  qtyReceived: number;
}

/**
 * Penerimaan barang (GRN) terhadap PO — parsial & bisa berulang.
 * Penerima diambil dari user login (@CurrentUser), bukan body.
 */
export class CreateReceiptDTO {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDTO)
  items: ReceiptItemDTO[];
}
