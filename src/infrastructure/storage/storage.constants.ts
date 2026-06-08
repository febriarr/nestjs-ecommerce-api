/**
 * Injection token untuk abstraction StorageProvider.
 *
 * Consumer melakukan injeksi via `@Inject(STORAGE_PROVIDER)` sehingga business
 * logic hanya bergantung pada interface, bukan implementasi konkret (R2/S3/...).
 */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER' as const;
