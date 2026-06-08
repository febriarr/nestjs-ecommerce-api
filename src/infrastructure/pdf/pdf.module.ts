import { Module } from '@nestjs/common';
import { PDF_GENERATOR } from './pdf.constants';
import { PuppeteerPdfGenerator } from './puppeteer-pdf.generator';

/**
 * Module PDF generation.
 *
 * Mengganti engine cukup dengan menukar `useClass` ke implementasi lain
 * yang memenuhi `PdfGenerator`. Consumer bergantung pada token PDF_GENERATOR.
 */
@Module({
  providers: [{ provide: PDF_GENERATOR, useClass: PuppeteerPdfGenerator }],
  exports: [PDF_GENERATOR],
})
export class PdfModule {}
