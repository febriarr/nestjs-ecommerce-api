import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser, LaunchOptions, PaperFormat } from 'puppeteer';
import { PdfGenerator } from './pdf-generator.interface';

const PDF_FORMAT: PaperFormat = 'A4';
const PDF_MARGIN = {
  top: '20mm',
  right: '15mm',
  bottom: '20mm',
  left: '15mm',
} as const;

/**
 * Implementasi PdfGenerator berbasis Puppeteer.
 *
 * Menggunakan SATU instance browser (singleton) yang di-launch secara lazy dan
 * dipakai ulang antar request — tidak meluncurkan browser baru tiap request.
 * Browser ditutup saat aplikasi shutdown (onApplicationShutdown).
 */
@Injectable()
export class PuppeteerPdfGenerator
  implements PdfGenerator, OnApplicationShutdown
{
  private readonly logger = new Logger(PuppeteerPdfGenerator.name);
  private browser: Browser | null = null;
  /** Guard agar launch tidak terjadi dua kali pada request konkuren. */
  private launchPromise: Promise<Browser> | null = null;

  constructor(private readonly config: ConfigService) {}

  async generate(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      // 'load' menunggu seluruh resource (termasuk logo) selesai dimuat.
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: PDF_FORMAT,
        printBackground: true,
        margin: { ...PDF_MARGIN },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }
    if (this.launchPromise) {
      return this.launchPromise;
    }

    this.launchPromise = this.launchBrowser();
    try {
      this.browser = await this.launchPromise;
      return this.browser;
    } finally {
      this.launchPromise = null;
    }
  }

  private async launchBrowser(): Promise<Browser> {
    const options: LaunchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    // Opsional: path executable Chrome custom (mis. di container produksi).
    const executablePath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');
    if (executablePath !== undefined && executablePath !== '') {
      options.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(options);
    this.logger.log('Puppeteer browser launched');
    return browser;
  }
}
