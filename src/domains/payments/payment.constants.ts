/**
 * Injection token untuk abstraction PaymentGateway.
 *
 * Consumer melakukan injeksi via `@Inject(PAYMENT_GATEWAY)` sehingga business
 * logic hanya bergantung pada interface, bukan implementasi konkret
 * (Dummy/Midtrans/Xendit/...).
 */
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY' as const;
