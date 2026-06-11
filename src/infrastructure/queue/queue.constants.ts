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

/** Nama queue untuk seluruh job terkait order. */
export const ORDER_QUEUE = 'order' as const;

/** Nama job di dalam ORDER_QUEUE. */
export const ORDER_JOB = {
  /** Lepas reservasi stok & tandai EXPIRED bila order masih PENDING. */
  EXPIRE: 'expire',
} as const;

export type OrderJobName = (typeof ORDER_JOB)[keyof typeof ORDER_JOB];

/** Payload job order (cukup id; data lengkap diambil dari DB di worker). */
export interface OrderJobData {
  orderId: string;
}

/** Batas job order aktif bersamaan per worker (operasi DB ringan). */
export const ORDER_WORKER_CONCURRENCY = 5;
