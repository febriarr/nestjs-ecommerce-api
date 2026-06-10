import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  INVOICE_PAYMENT_STATUSES,
  type InvoicePaymentStatus,
} from '../../../infrastructure/database/schema';

export class UpdateInvoiceStatusDTO {
  /**
   * Status target. Untuk PAID/PARTIALLY_PAID, `amountPaid` wajib & divalidasi
   * terhadap total. UNPAID tidak dapat di-set manual.
   */
  @IsIn(INVOICE_PAYMENT_STATUSES)
  status: InvoicePaymentStatus;

  /** Akumulasi total yang sudah dibayar (Rupiah penuh). */
  @IsOptional()
  @IsInt()
  @Min(0)
  amountPaid?: number;
}
