/**
 * Abstraction untuk konversi HTML menjadi dokumen PDF.
 *
 * Implementasi (Puppeteer, Playwright, wkhtmltopdf, dll.) cukup memenuhi
 * kontrak ini sehingga business logic tidak berubah ketika engine diganti.
 */
export interface PdfGenerator {
  /**
   * Render string HTML menjadi PDF.
   *
   * @param html Markup HTML lengkap (inline CSS dianjurkan).
   * @returns Buffer berisi konten PDF.
   */
  generate(html: string): Promise<Buffer>;
}
