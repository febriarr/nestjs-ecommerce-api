import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { uuidv7 } from 'uuidv7';
import { InvoicesRepository } from './invoices.repository';
import { CreateInvoiceDTO } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/response-invoice.dto';
import { renderInvoiceHtml } from './templates/invoice.template';
import {
  InsertInvoices,
  InvoiceItemSnapshot,
  SelectInvoices,
} from '../../infrastructure/database/schema';
import { CompanyConfigService } from '../../infrastructure/config/company.config';
import { PDF_GENERATOR } from '../../infrastructure/pdf/pdf.constants';
import type { PdfGenerator } from '../../infrastructure/pdf/pdf-generator.interface';
import { STORAGE_PROVIDER } from '../../infrastructure/storage/storage.constants';
import type { StorageProvider } from '../../infrastructure/storage/storage-provider.interface';
import { AppException } from '../../common/exceptions/app-exceptions';
import {
  InvoiceNotFoundException,
  InvoicePdfGenerationFailedException,
} from '../../common/exceptions/domains/invoice.exceptions';

const PDF_CONTENT_TYPE = 'application/pdf';

export interface InvoicePdfStream {
  stream: Readable;
  filename: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly publicBaseUrl: string;

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly companyConfig: CompanyConfigService,
    private readonly config: ConfigService,
    @Inject(PDF_GENERATOR) private readonly pdfGenerator: PdfGenerator,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider
  ) {
    this.publicBaseUrl = this.config
      .getOrThrow<string>('R2_PUBLIC_URL')
      .replace(/\/+$/, '');
  }

  async createInvoice(dto: CreateInvoiceDTO): Promise<InvoiceResponseDto> {
    const items: InvoiceItemSnapshot[] = dto.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = subtotal;

    const payload: InsertInvoices = {
      invoiceNumber: dto.invoiceNumber ?? this.generateInvoiceNumber(),
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      items,
      subtotal,
      total,
      ...(dto.issueDate ? { issueDate: new Date(dto.issueDate) } : {}),
    };

    const invoice = await this.invoicesRepository.insert(payload);
    return this.toInvoiceResponse(invoice);
  }

  async findById(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);
    return this.toInvoiceResponse(invoice);
  }

  /**
   * Flow generate invoice PDF:
   *   1. Ambil data invoice dari repository.
   *   2. Render HTML template.
   *   3. Generate PDF via PdfGenerator.
   *   4. Upload PDF ke StorageProvider.
   *   5. Simpan storage key ke database.
   *   6. Kembalikan metadata invoice.
   */
  async generateInvoicePdf(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);

    try {
      const html = renderInvoiceHtml({
        company: this.companyConfig.getCompanyInfo(),
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        items: invoice.items,
        subtotal: invoice.subtotal,
        total: invoice.total,
      });

      const pdf = await this.pdfGenerator.generate(html);
      const key = this.buildPdfKey(invoice.invoiceNumber);
      await this.storage.upload(pdf, key, PDF_CONTENT_TYPE);

      const updated = await this.invoicesRepository.updatePdfKey(id, key);
      return this.toInvoiceResponse(updated);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(
        `Gagal generate PDF untuk invoice ${invoice.invoiceNumber}`,
        error
      );
      throw InvoicePdfGenerationFailedException({ cause: error });
    }
  }

  /**
   * Ambil PDF invoice sebagai stream untuk diunduh.
   * Bila PDF belum pernah di-generate, generate terlebih dahulu.
   */
  async getInvoicePdfStream(id: string): Promise<InvoicePdfStream> {
    let invoice = await this.getInvoiceOrThrow(id);

    if (
      invoice.pdfKey === null ||
      !(await this.storage.exists(invoice.pdfKey))
    ) {
      await this.generateInvoicePdf(id);
      invoice = await this.getInvoiceOrThrow(id);
    }

    if (invoice.pdfKey === null) {
      throw InvoicePdfGenerationFailedException();
    }

    const stream = await this.storage.getObject(invoice.pdfKey);
    return { stream, filename: `${invoice.invoiceNumber}.pdf` };
  }

  private async getInvoiceOrThrow(id: string): Promise<SelectInvoices> {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw InvoiceNotFoundException({ details: { id } });
    }
    return invoice;
  }

  private toInvoiceResponse(invoice: SelectInvoices): InvoiceResponseDto {
    return new InvoiceResponseDto({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      items: invoice.items,
      subtotal: invoice.subtotal,
      total: invoice.total,
      pdfKey: invoice.pdfKey,
      pdfUrl:
        invoice.pdfKey === null
          ? null
          : `${this.publicBaseUrl}/${invoice.pdfKey}`,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }

  private buildPdfKey(invoiceNumber: string): string {
    return `invoices/${invoiceNumber}.pdf`;
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const unique = uuidv7().replace(/-/g, '').slice(-6).toUpperCase();
    return `INV-${datePart}-${unique}`;
  }
}
