import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { uuidv7 } from 'uuidv7';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceQueueProducer } from './invoices.queue';
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
import { MailService } from '../../infrastructure/mail/mail.service';
import { streamToBuffer } from '../../common/utils/stream.util';
import { AppException } from '../../common/exceptions/app-exceptions';
import {
  InvoiceNotFoundException,
  InvoicePdfGenerationFailedException,
} from '../../common/exceptions/domains/invoice.exceptions';

const PDF_CONTENT_TYPE = 'application/pdf';
const FAILURE_REASON_MAX = 512;

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
    private readonly queueProducer: InvoiceQueueProducer,
    private readonly mailService: MailService,
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

    // Status awal UNPAID; PDF & email belum diproses (lihat markAsPaid).
    const invoice = await this.invoicesRepository.insert(payload);
    return this.toInvoiceResponse(invoice);
  }

  async findById(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);
    return this.toInvoiceResponse(invoice);
  }

  /**
   * Tandai invoice sebagai PAID lalu picu pipeline generate PDF + kirim email.
   *
   * Ini adalah integration seam untuk payment webhook (belum ada). Nanti webhook
   * cukup memanggil method ini setelah verifikasi pembayaran & set order paid.
   * Idempotent: bila sudah PAID, tidak memicu ulang.
   */
  async markAsPaid(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);

    if (invoice.status === 'PAID') {
      this.logger.log(`Invoice ${invoice.invoiceNumber} sudah PAID — dilewati`);
      return this.toInvoiceResponse(invoice);
    }

    const paid = await this.invoicesRepository.update(id, {
      status: 'PAID',
      paidAt: new Date(),
    });

    await this.queueProducer.enqueueGeneratePdf(id);

    return this.toInvoiceResponse(paid);
  }

  /**
   * Enqueue ulang pipeline pengiriman (generate bila perlu → email).
   * Dipakai untuk kirim ulang manual.
   */
  async requeueDelivery(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);
    await this.queueProducer.enqueueGeneratePdf(id);
    return this.toInvoiceResponse(invoice);
  }

  /**
   * Generate PDF invoice (dipanggil dari worker / fallback download):
   * render HTML → PDF → upload storage → simpan pdfKey + status READY.
   */
  async generateInvoicePdf(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.getInvoiceOrThrow(id);
    await this.invoicesRepository.update(id, { pdfStatus: 'PROCESSING' });

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

      const updated = await this.invoicesRepository.update(id, {
        pdfKey: key,
        pdfStatus: 'READY',
        failureReason: null,
      });
      return this.toInvoiceResponse(updated);
    } catch (error) {
      await this.invoicesRepository.update(id, {
        pdfStatus: 'FAILED',
        failureReason: this.toFailureReason(error),
      });
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
   * Kirim email invoice berlampir PDF (dipanggil dari worker).
   * Memastikan PDF tersedia (generate bila perlu) lalu kirim via MailService.
   */
  async sendInvoiceEmail(id: string): Promise<void> {
    const invoice = await this.ensurePdfReady(id);

    try {
      const stream = await this.storage.getObject(invoice.pdfKey as string);
      const pdf = await streamToBuffer(stream);

      await this.mailService.sendInvoice({
        to: invoice.customerEmail,
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        pdf,
      });

      await this.invoicesRepository.update(id, {
        emailStatus: 'SENT',
        sentAt: new Date(),
        failureReason: null,
      });
    } catch (error) {
      await this.invoicesRepository.update(id, {
        emailStatus: 'FAILED',
        failureReason: this.toFailureReason(error),
      });
      throw error;
    }
  }

  /**
   * Ambil PDF invoice sebagai stream untuk diunduh.
   * Bila PDF belum tersedia, generate terlebih dahulu (fallback sinkron).
   */
  async getInvoicePdfStream(id: string): Promise<InvoicePdfStream> {
    const invoice = await this.ensurePdfReady(id);
    const stream = await this.storage.getObject(invoice.pdfKey as string);
    return { stream, filename: `${invoice.invoiceNumber}.pdf` };
  }

  /** Pastikan invoice punya PDF yang valid di storage; generate bila belum. */
  private async ensurePdfReady(id: string): Promise<SelectInvoices> {
    const invoice = await this.getInvoiceOrThrow(id);
    if (
      invoice.pdfKey !== null &&
      (await this.storage.exists(invoice.pdfKey))
    ) {
      return invoice;
    }

    await this.generateInvoicePdf(id);
    const refreshed = await this.getInvoiceOrThrow(id);
    if (refreshed.pdfKey === null) {
      throw InvoicePdfGenerationFailedException({ details: { id } });
    }
    return refreshed;
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
      status: invoice.status,
      paidAt: invoice.paidAt,
      pdfKey: invoice.pdfKey,
      pdfUrl:
        invoice.pdfKey === null
          ? null
          : `${this.publicBaseUrl}/${invoice.pdfKey}`,
      pdfStatus: invoice.pdfStatus,
      emailStatus: invoice.emailStatus,
      sentAt: invoice.sentAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }

  private buildPdfKey(invoiceNumber: string): string {
    return `invoices/${invoiceNumber}.pdf`;
  }

  private toFailureReason(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, FAILURE_REASON_MAX);
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
