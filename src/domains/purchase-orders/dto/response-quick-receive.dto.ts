import { Expose } from 'class-transformer';
import { PurchaseOrderResponseDto } from './response-purchase-order.dto';
import { ReceiptResponseDto } from './response-receipt.dto';

/** Hasil quick-receive: PO (langsung RECEIVED) + dokumen GRN-nya. */
export class QuickReceiveResponseDto {
  @Expose()
  purchaseOrder: PurchaseOrderResponseDto;

  @Expose()
  receipt: ReceiptResponseDto;

  constructor(partial: Partial<QuickReceiveResponseDto>) {
    Object.assign(this, partial);
  }
}
