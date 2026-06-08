import { Expose } from 'class-transformer';
import { InvoiceItemSnapshot } from '../../../infrastructure/database/schema';

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

  @Expose()
  pdfKey: string | null;

  /** URL publik PDF (null bila PDF belum di-generate). */
  @Expose()
  pdfUrl: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<InvoiceResponseDto>) {
    Object.assign(this, partial);
  }
}
