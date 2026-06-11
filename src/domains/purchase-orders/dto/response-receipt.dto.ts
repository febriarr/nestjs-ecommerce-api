import { Expose } from 'class-transformer';

export interface ReceiptItemResponse {
  poItemId: number;
  variantId: number;
  qtyReceived: number;
  unitCost: number;
  /** Penerimaan ini melebihi sisa pesanan saat diterima. */
  overReceived: boolean;
}

export class ReceiptResponseDto {
  @Expose()
  id: string;

  @Expose()
  receiptNumber: string;

  @Expose()
  poId: string;

  @Expose()
  outletId: number;

  @Expose()
  receivedBy: string;

  @Expose()
  notes: string | null;

  @Expose()
  receivedAt: Date;

  @Expose()
  items: ReceiptItemResponse[];

  constructor(partial: Partial<ReceiptResponseDto>) {
    Object.assign(this, partial);
  }
}
