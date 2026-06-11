/**
 * Abstraksi payment gateway (provider-agnostic) — pola sama dengan
 * StorageProvider/PdfGenerator. Implementasi pertama: DummyPaymentGateway
 * (manual, HMAC). Midtrans/Xendit kelak cukup mengimplementasikan interface
 * ini tanpa menyentuh PaymentsService.
 */

export interface PaymentInitiateParams {
  orderId: string;
  orderNumber: string;
  /** Total order dalam Rupiah penuh. */
  amount: number;
  customerEmail: string;
}

export interface PaymentInitiation {
  /** Id transaksi di sisi provider; null untuk provider manual. */
  externalId: string | null;
  /** Kode bayar untuk user (VA number, kode dummy, URL redirect, dll.). */
  paymentCode: string;
  /** Petunjuk pembayaran yang bisa ditampilkan langsung ke user. */
  instructions: string;
}

export type PaymentWebhookStatus = 'SUCCEEDED' | 'FAILED';

/** Event ternormalisasi hasil parsing payload webhook provider. */
export interface PaymentWebhookEvent {
  orderId: string;
  status: PaymentWebhookStatus;
  /** Nominal yang dibayarkan (Rupiah penuh). */
  amount: number;
  externalId: string | null;
}

export interface PaymentGateway {
  /** Identifier provider (dipakai pada path webhook & kolom payments.provider). */
  readonly provider: string;

  initiate(params: PaymentInitiateParams): Promise<PaymentInitiation>;

  /** Verifikasi signature sebuah event webhook. */
  verifySignature(event: PaymentWebhookEvent, signature: string): boolean;
}
