import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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
 * Kasir = user login (@Roles admin).
 *
 * Identitas pelanggan opsional:
 * - `userId` ada → pelanggan member (nama/email diambil dari akun).
 * - `userId` kosong → walk-in; pakai `customerName`/`customerEmail` bila
 *   dikirim, atau fallback "Pelanggan Umum" tanpa email (invoice tetap
 *   dibuat, email dilewati).
 */
export class CreateOfflineOrderDTO {
  /** Pelanggan member; kosongkan untuk walk-in. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Nama pelanggan walk-in (diabaikan bila `userId` ada). */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value.trim())
  customerName?: string;

  /** Email pelanggan walk-in untuk struk (opsional). */
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  customerEmail?: string;

  @IsInt()
  @Min(1)
  outletId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OfflineOrderItemDTO)
  items: OfflineOrderItemDTO[];
}
