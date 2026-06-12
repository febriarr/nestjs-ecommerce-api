import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { OrdersService } from '../orders/orders.service';
import { OrdersRepository } from '../orders/orders.repository';
import { PAYMENT_GATEWAY } from './payment.constants';
import type {
  PaymentGateway,
  PaymentWebhookEvent,
} from './payment-gateway.interface';
import { InitiatePaymentDTO } from './dto/initiate-payment.dto';
import { PaymentWebhookDTO } from './dto/payment-webhook.dto';
import { RefundOrderDTO } from './dto/refund-order.dto';
import { PaymentResponseDto } from './dto/response-payment.dto';
import { OrderResponseDto } from '../orders/dto/response-order.dto';
import {
  SelectPayment,
  SelectUser,
} from '../../infrastructure/database/schema';
import { assertSelfOrAdmin } from '../auth/authz.util';
import {
  PaymentAmountMismatchException,
  PaymentNotFoundException,
  PaymentOrderNotPayableException,
  PaymentProviderUnsupportedException,
  PaymentSignatureInvalidException,
} from '../../common/exceptions/domains/payment.exceptions';
import { OrderNotFoundException } from '../../common/exceptions/domains/order.exceptions';
import { UserNotFoundException } from '../../common/exceptions/domains/user.exceptions';

const FAILURE_REASON_MAX = 512;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
    private readonly ordersRepository: OrdersRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway
  ) {}

  /**
   * Inisiasi pembayaran order PENDING — hanya pemilik order (atau admin).
   * Idempotent: bila sudah ada attempt PENDING untuk order yang sama,
   * attempt itu yang dikembalikan (partial unique index pagar terakhir).
   */
  async initiate(
    requester: SelectUser,
    dto: InitiatePaymentDTO
  ): Promise<PaymentResponseDto> {
    const order = await this.ordersRepository.findById(dto.orderId);
    if (!order) {
      throw OrderNotFoundException({ details: { id: dto.orderId } });
    }
    assertSelfOrAdmin(requester, order.userId);
    if (order.status !== 'PENDING') {
      throw PaymentOrderNotPayableException({
        details: { orderId: order.id, status: order.status },
      });
    }

    const existing = await this.paymentsRepository.findPendingByOrder(order.id);
    if (existing) {
      return this.toPaymentResponse(existing, null);
    }

    const customer = await this.ordersRepository.customerById(order.userId);
    if (!customer) {
      throw UserNotFoundException({ details: { userId: order.userId } });
    }

    const initiation = await this.gateway.initiate({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      customerEmail: customer.email,
    });

    const payment = await this.paymentsRepository.insert({
      orderId: order.id,
      provider: this.gateway.provider,
      externalId: initiation.externalId,
      paymentCode: initiation.paymentCode,
      amount: order.total,
    });

    return this.toPaymentResponse(payment, initiation.instructions);
  }

  /**
   * Webhook pembayaran: verifikasi signature → SUCCEEDED: order PAID
   * (finalisasi stok outlet) → invoice PAID (pipeline PDF + email otomatis).
   * Idempotent terhadap retry webhook untuk order yang sudah dibayar.
   */
  async handleWebhook(
    provider: string,
    dto: PaymentWebhookDTO
  ): Promise<PaymentResponseDto> {
    if (provider !== this.gateway.provider) {
      throw PaymentProviderUnsupportedException({ details: { provider } });
    }

    const event: PaymentWebhookEvent = {
      orderId: dto.orderId,
      status: dto.status,
      amount: dto.amount,
      externalId: null,
    };
    if (!this.gateway.verifySignature(event, dto.signature)) {
      throw PaymentSignatureInvalidException({
        details: { orderId: dto.orderId },
      });
    }

    const order = await this.ordersRepository.findById(dto.orderId);
    if (!order) {
      throw OrderNotFoundException({ details: { id: dto.orderId } });
    }

    const pending = await this.paymentsRepository.findPendingByOrder(order.id);
    if (!pending) {
      // Retry webhook setelah sukses → idempotent, kembalikan hasil final.
      const succeeded = await this.paymentsRepository.findSucceededByOrder(
        order.id
      );
      if (succeeded) {
        return this.toPaymentResponse(succeeded, null);
      }
      throw PaymentNotFoundException({ details: { orderId: order.id } });
    }

    if (dto.status === 'FAILED') {
      const failed = await this.paymentsRepository.update(pending.id, {
        status: 'FAILED',
        failureReason: 'Ditolak oleh provider (webhook FAILED).'.slice(
          0,
          FAILURE_REASON_MAX
        ),
      });
      this.logger.warn(`Pembayaran order ${order.orderNumber} gagal (webhook)`);
      return this.toPaymentResponse(failed, null);
    }

    if (dto.amount !== order.total) {
      throw PaymentAmountMismatchException({
        details: { amount: dto.amount, total: order.total },
      });
    }

    // Order dulu (stok + invoice, idempotent), baru tandai payment — bila
    // langkah kedua gagal, retry webhook akan menyembuhkan diri sendiri.
    await this.ordersService.markPaid(order.id);
    const succeeded = await this.paymentsRepository.update(pending.id, {
      status: 'SUCCEEDED',
      paidAt: new Date(),
    });

    this.logger.log(`Pembayaran order ${order.orderNumber} sukses (webhook)`);
    return this.toPaymentResponse(succeeded, null);
  }

  /**
   * Pembayaran TUNAI di kasir (POS): order PENDING langsung PAID (finalisasi
   * stok + invoice → pipeline PDF/email), lalu dicatat sebagai payment
   * provider 'cash'. Attempt gateway yang masih PENDING ditandai FAILED
   * (dibatalkan — dibayar tunai). Idempotent bila sudah dibayar.
   */
  async payCash(orderId: string, actorId: string): Promise<PaymentResponseDto> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw OrderNotFoundException({ details: { id: orderId } });
    }

    const succeeded = await this.paymentsRepository.findSucceededByOrder(
      order.id
    );
    if (succeeded) {
      return this.toPaymentResponse(succeeded, null);
    }
    if (order.status !== 'PENDING') {
      throw PaymentOrderNotPayableException({
        details: { orderId: order.id, status: order.status },
      });
    }

    const pending = await this.paymentsRepository.findPendingByOrder(order.id);
    if (pending) {
      await this.paymentsRepository.update(pending.id, {
        status: 'FAILED',
        failureReason: 'Dibatalkan — order dibayar tunai di kasir.',
      });
    }

    // Order dulu (stok + invoice, idempotent), baru catat payment — retry
    // payCash setelah gagal di langkah kedua menyembuhkan diri sendiri.
    await this.ordersService.markPaid(order.id);
    const payment = await this.paymentsRepository.insert({
      orderId: order.id,
      provider: 'cash',
      externalId: null,
      paymentCode: null,
      amount: order.total,
      status: 'SUCCEEDED',
      paidAt: new Date(),
    });

    this.logger.log(
      `Order ${order.orderNumber} dibayar tunai (kasir ${actorId})`
    );
    return this.toPaymentResponse(payment, null);
  }

  /**
   * Refund penuh order PAID: order → REFUNDED (+ restock opsional via
   * ledger REFUND_RESTOCK), payment SUCCEEDED ditandai REFUNDED.
   */
  async refund(
    dto: RefundOrderDTO,
    actorId: string
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findById(dto.orderId);
    if (!order) {
      throw OrderNotFoundException({ details: { id: dto.orderId } });
    }

    const refunded = await this.ordersService.markRefunded(order.id, {
      restock: dto.restock ?? true,
      reason: dto.reason,
      actorId,
    });

    const succeeded = await this.paymentsRepository.findSucceededByOrder(
      order.id
    );
    if (succeeded) {
      await this.paymentsRepository.update(succeeded.id, {
        status: 'REFUNDED',
      });
    }

    this.logger.log(`Order ${order.orderNumber} di-refund (oleh ${actorId})`);
    return refunded;
  }

  private toPaymentResponse(
    payment: SelectPayment,
    instructions: string | null
  ): PaymentResponseDto {
    return new PaymentResponseDto({
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      externalId: payment.externalId,
      paymentCode: payment.paymentCode,
      amount: payment.amount,
      status: payment.status,
      instructions,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    });
  }
}
