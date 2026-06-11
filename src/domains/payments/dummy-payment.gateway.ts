import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  PaymentGateway,
  PaymentInitiateParams,
  PaymentInitiation,
  PaymentWebhookEvent,
} from './payment-gateway.interface';

/**
 * Gateway manual/dummy untuk menguji alur pembayaran end-to-end tanpa akun
 * pihak ketiga. Webhook "provider" disimulasikan dengan request manual yang
 * ditandatangani HMAC-SHA256 (hex) atas string kanonik
 * `orderId:status:amount` memakai secret `PAYMENT_WEBHOOK_SECRET`.
 *
 * Secret dibaca saat dipakai (bukan di constructor) agar boot aplikasi tidak
 * gagal bila env belum di-set — pola sama dengan CompanyConfigService.
 */
@Injectable()
export class DummyPaymentGateway implements PaymentGateway {
  readonly provider = 'dummy';

  constructor(private readonly config: ConfigService) {}

  initiate(params: PaymentInitiateParams): Promise<PaymentInitiation> {
    const paymentCode = `PAY-${params.orderNumber}`;
    return Promise.resolve({
      externalId: null,
      paymentCode,
      instructions:
        `Pembayaran manual: transfer Rp${params.amount} dengan berita ` +
        `"${paymentCode}", lalu konfirmasi via webhook dummy.`,
    });
  }

  verifySignature(event: PaymentWebhookEvent, signature: string): boolean {
    const expected = this.buildSignature(event);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const givenBuffer = Buffer.from(signature, 'utf8');
    return (
      expectedBuffer.length === givenBuffer.length &&
      timingSafeEqual(expectedBuffer, givenBuffer)
    );
  }

  /** Hitung signature kanonik — juga dipakai test/simulasi webhook. */
  buildSignature(event: PaymentWebhookEvent): string {
    const payload = `${event.orderId}:${event.status}:${event.amount}`;
    return createHmac('sha256', this.secret()).update(payload).digest('hex');
  }

  private secret(): string {
    return this.config.getOrThrow<string>('PAYMENT_WEBHOOK_SECRET');
  }
}
