import { Expose } from 'class-transformer';
import type {
  OrderChannel,
  OrderShippingAddress,
  OrderStatus,
} from '../../../infrastructure/database/schema';

export interface OrderItemResponse {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string | null;
  skuCode: string;
  /** Harga satuan setelah diskon (snapshot saat checkout). */
  unitPrice: number;
  discountAmount: number;
  quantity: number;
  lineTotal: number;
}

export class OrderResponseDto {
  @Expose()
  id: string;

  @Expose()
  orderNumber: string;

  /** Null untuk order OFFLINE walk-in tanpa akun member. */
  @Expose()
  userId: string | null;

  @Expose()
  outletId: number;

  @Expose()
  outletName: string | null;

  @Expose()
  channel: OrderChannel;

  @Expose()
  status: OrderStatus;

  @Expose()
  invoiceId: string | null;

  @Expose()
  shippingAddress: OrderShippingAddress | null;

  @Expose()
  subtotal: number;

  @Expose()
  discountTotal: number;

  @Expose()
  shippingFee: number;

  @Expose()
  total: number;

  @Expose()
  items: OrderItemResponse[];

  @Expose()
  expiresAt: Date | null;

  @Expose()
  paidAt: Date | null;

  @Expose()
  cancelledAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
  }
}
