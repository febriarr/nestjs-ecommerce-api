import { JobsOptions } from 'bullmq';

/** Nama queue untuk seluruh job terkait invoice. */
export const INVOICE_QUEUE = 'invoice' as const;

/** Nama job di dalam INVOICE_QUEUE. */
export const INVOICE_JOB = {
  GENERATE_PDF: 'generate-pdf',
  SEND_EMAIL: 'send-email',
} as const;

export type InvoiceJobName = (typeof INVOICE_JOB)[keyof typeof INVOICE_JOB];

/** Payload job invoice (cukup id; data lengkap diambil dari DB di worker). */
export interface InvoiceJobData {
  invoiceId: string;
}

/**
 * Batas job aktif bersamaan per worker — membatasi beban render Puppeteer.
 * Tuning knob; bukan secret/konfigurasi per-environment.
 */
export const INVOICE_WORKER_CONCURRENCY = 3;

/** Opsi default tiap job: retry dengan exponential backoff. */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};
