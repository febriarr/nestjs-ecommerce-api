import { IsIn, IsInt, IsString, IsUUID, Min } from 'class-validator';
import type { PaymentWebhookStatus } from '../payment-gateway.interface';

const WEBHOOK_STATUSES: readonly PaymentWebhookStatus[] = [
  'SUCCEEDED',
  'FAILED',
];

/**
 * Payload webhook gateway dummy. Signature = HMAC-SHA256 hex atas
 * `orderId:status:amount` dengan PAYMENT_WEBHOOK_SECRET.
 */
export class PaymentWebhookDTO {
  @IsUUID()
  orderId: string;

  @IsIn(WEBHOOK_STATUSES)
  status: PaymentWebhookStatus;

  /** Nominal yang dibayarkan (Rupiah penuh); harus sama dengan total order. */
  @IsInt()
  @Min(0)
  amount: number;

  @IsString()
  signature: string;
}
