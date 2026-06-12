import { IsUUID } from 'class-validator';

/** Pembayaran tunai di kasir (POS) — langsung melunasi order PENDING. */
export class PayCashDTO {
  @IsUUID()
  orderId: string;
}
