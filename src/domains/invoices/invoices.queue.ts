import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DEFAULT_JOB_OPTIONS,
  INVOICE_JOB,
  INVOICE_QUEUE,
  InvoiceJobData,
} from '../../infrastructure/queue/queue.constants';

/**
 * Producer: memasukkan job invoice ke queue. Memisahkan tanggung jawab
 * "enqueue" dari business logic di InvoicesService.
 */
@Injectable()
export class InvoiceQueueProducer {
  constructor(
    @InjectQueue(INVOICE_QUEUE) private readonly queue: Queue<InvoiceJobData>
  ) {}

  async enqueueGeneratePdf(invoiceId: string): Promise<void> {
    await this.queue.add(
      INVOICE_JOB.GENERATE_PDF,
      { invoiceId },
      DEFAULT_JOB_OPTIONS
    );
  }

  async enqueueSendEmail(invoiceId: string): Promise<void> {
    await this.queue.add(
      INVOICE_JOB.SEND_EMAIL,
      { invoiceId },
      DEFAULT_JOB_OPTIONS
    );
  }
}
