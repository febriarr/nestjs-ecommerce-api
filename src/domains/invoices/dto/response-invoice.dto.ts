import { Expose } from 'class-transformer';
import type {
  InvoiceEmailStatus,
  InvoiceItemSnapshot,
  InvoicePaymentStatus,
  InvoicePdfStatus,
} from '../../../infrastructure/database/schema';

export class InvoiceResponseDto {
  @Expose()
  id: string;

  @Expose()
  invoiceNumber: string;

  @Expose()
  issueDate: Date;

  @Expose()
  customerName: string;

  @Expose()
  customerEmail: string;

  @Expose()
  items: InvoiceItemSnapshot[];

  @Expose()
  subtotal: number;

  @Expose()
  total: number;

  /** Status pembayaran (UNPAID/PAID). */
  @Expose()
  status: InvoicePaymentStatus;

  @Expose()
  paidAt: Date | null;

  @Expose()
  pdfKey: string | null;

  /** URL publik PDF (null bila PDF belum di-generate). */
  @Expose()
  pdfUrl: string | null;

  /** Status pipeline PDF (PENDING/PROCESSING/READY/FAILED). */
  @Expose()
  pdfStatus: InvoicePdfStatus;

  /** Status pengiriman email (PENDING/SENT/FAILED). */
  @Expose()
  emailStatus: InvoiceEmailStatus;

  @Expose()
  sentAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<InvoiceResponseDto>) {
    Object.assign(this, partial);
  }
}
