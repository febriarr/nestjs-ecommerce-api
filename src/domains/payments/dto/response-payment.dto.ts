import { Expose } from 'class-transformer';
import type {
  PaymentMethod,
  PaymentStatus,
} from '../../../infrastructure/database/schema';

export class PaymentResponseDto {
  @Expose()
  id: string;

  @Expose()
  orderId: string;

  @Expose()
  provider: string;

  /** Tender: CASH | CARD | QRIS | TRANSFER (offline) | ONLINE (gateway). */
  @Expose()
  method: PaymentMethod;

  /** No. referensi settlement offline (null bila tidak ada). */
  @Expose()
  reference: string | null;

  @Expose()
  externalId: string | null;

  @Expose()
  paymentCode: string | null;

  @Expose()
  amount: number;

  @Expose()
  status: PaymentStatus;

  /** Petunjuk pembayaran (hanya saat inisiasi). */
  @Expose()
  instructions: string | null;

  @Expose()
  paidAt: Date | null;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<PaymentResponseDto>) {
    Object.assign(this, partial);
  }
}
