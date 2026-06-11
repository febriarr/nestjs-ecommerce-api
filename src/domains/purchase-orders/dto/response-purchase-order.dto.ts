import { Expose } from 'class-transformer';
import type { PurchaseOrderStatus } from '../../../infrastructure/database/schema';

export interface PoItemResponse {
  id: number;
  variantId: number;
  skuCode: string;
  variantName: string | null;
  productName: string;
  qtyOrdered: number;
  unitCost: number;
  lineTotal: number;
  qtyReceived: number;
  /** Sisa yang belum diterima (0 bila penuh/over-receipt). */
  remaining: number;
}

export class PurchaseOrderResponseDto {
  @Expose()
  id: string;

  @Expose()
  poNumber: string;

  @Expose()
  supplierId: number;

  @Expose()
  supplierName: string | null;

  @Expose()
  outletId: number;

  @Expose()
  outletName: string | null;

  @Expose()
  status: PurchaseOrderStatus;

  @Expose()
  expectedAt: Date | null;

  @Expose()
  notes: string | null;

  @Expose()
  createdBy: string;

  @Expose()
  items: PoItemResponse[];

  /** Jumlah qtyOrdered * unitCost seluruh item. */
  @Expose()
  subtotal: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<PurchaseOrderResponseDto>) {
    Object.assign(this, partial);
  }
}
