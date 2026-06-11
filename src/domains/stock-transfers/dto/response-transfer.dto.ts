import { Expose } from 'class-transformer';
import type { StockTransferStatus } from '../../../infrastructure/database/schema';

export interface TransferItemResponse {
  variantId: number;
  skuCode: string;
  variantName: string | null;
  productName: string;
  quantity: number;
}

export class TransferResponseDto {
  @Expose()
  id: string;

  @Expose()
  transferNumber: string;

  @Expose()
  fromOutletId: number;

  @Expose()
  fromOutletName: string | null;

  @Expose()
  toOutletId: number;

  @Expose()
  toOutletName: string | null;

  @Expose()
  status: StockTransferStatus;

  @Expose()
  notes: string | null;

  @Expose()
  createdBy: string;

  @Expose()
  items: TransferItemResponse[];

  @Expose()
  sentAt: Date | null;

  @Expose()
  receivedAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<TransferResponseDto>) {
    Object.assign(this, partial);
  }
}
