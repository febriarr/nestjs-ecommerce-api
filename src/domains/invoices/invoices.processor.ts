import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  INVOICE_JOB,
  INVOICE_QUEUE,
  INVOICE_WORKER_CONCURRENCY,
  InvoiceJobData,
} from '../../infrastructure/queue/queue.constants';
import { InvoicesService } from './invoices.service';
import { InvoiceQueueProducer } from './invoices.queue';

/**
 * Worker queue invoice. Concurrency dibatasi untuk menjaga beban render Puppeteer.
 *
 * Alur: GENERATE_PDF (render + upload) → setelah sukses, enqueue SEND_EMAIL
 * (kirim email berlampir PDF). Error pada job akan di-retry sesuai DEFAULT_JOB_OPTIONS.
 */
@Processor(INVOICE_QUEUE, { concurrency: INVOICE_WORKER_CONCURRENCY })
export class InvoicesProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoicesProcessor.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly producer: InvoiceQueueProducer
  ) {
    super();
  }

  async process(job: Job<InvoiceJobData>): Promise<void> {
    const { invoiceId } = job.data;

    switch (job.name) {
      case INVOICE_JOB.GENERATE_PDF:
        await this.invoicesService.generateInvoicePdf(invoiceId);
        await this.producer.enqueueSendEmail(invoiceId);
        return;
      case INVOICE_JOB.SEND_EMAIL:
        await this.invoicesService.sendInvoiceEmail(invoiceId);
        return;
      default:
        this.logger.warn(`Job invoice tidak dikenal: ${job.name}`);
        return;
    }
  }
}
