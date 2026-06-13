import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { paymentMethodEnum } from '../../../infrastructure/database/schema';

/** Tender OFFLINE yang dapat dipilih kasir (ONLINE hanya untuk gateway). */
export const OFFLINE_PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'QRIS',
  'TRANSFER',
] as const;
export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

/**
 * Pembayaran OFFLINE di kasir (POS) — langsung melunasi order PENDING.
 * Settlement (EDC/QRIS/transfer milik merchant) terjadi di luar sistem;
 * backend hanya mencatat metode + referensi untuk rekonsiliasi manual.
 */
export class PayManualDTO {
  @IsUUID()
  orderId: string;

  @IsIn(OFFLINE_PAYMENT_METHODS)
  method: OfflinePaymentMethod;

  /** No. referensi settlement (approval EDC / RRN QRIS / ref transfer). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  reference?: string;
}

// Guard: nilai DTO harus subset enum schema (kompilasi gagal bila menyimpang).
const _methodsAreValid: readonly (typeof paymentMethodEnum.enumValues)[number][] =
  OFFLINE_PAYMENT_METHODS;
void _methodsAreValid;
