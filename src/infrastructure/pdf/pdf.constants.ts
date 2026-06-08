/**
 * Injection token untuk abstraction PdfGenerator.
 *
 * Consumer melakukan injeksi via `@Inject(PDF_GENERATOR)` sehingga business
 * logic hanya bergantung pada interface, bukan implementasi konkret (Puppeteer/...).
 */
export const PDF_GENERATOR = 'PDF_GENERATOR' as const;
