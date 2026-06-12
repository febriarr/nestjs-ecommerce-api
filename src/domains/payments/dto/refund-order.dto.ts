import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** Refund penuh order PAID; pengembalian dana di luar sistem (dicatat saja). */
export class RefundOrderDTO {
  @IsUUID()
  orderId: string;

  /** Kembalikan item ke stok outlet (default true; false utk barang rusak). */
  @IsOptional()
  @IsBoolean()
  restock?: boolean;

  /** Alasan refund — tampil di jejak audit stok. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
