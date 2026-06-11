import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OfflineOrderItemDTO {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

/**
 * Order OFFLINE (POS/grosir): outlet = tempat kasir bertransaksi, tanpa
 * routing & tanpa alamat kirim. Item dikirim eksplisit (bukan dari cart).
 */
export class CreateOfflineOrderDTO {
  /** User pelanggan (akun member/walk-in yang sudah terdaftar). */
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(1)
  outletId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OfflineOrderItemDTO)
  items: OfflineOrderItemDTO[];
}
