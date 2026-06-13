import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { SelectUser } from '../../infrastructure/database/schema';
import { PayManualDTO } from './dto/pay-manual.dto';
import { RefundOrderDTO } from './dto/refund-order.dto';
import { OrderResponseDto } from '../orders/dto/response-order.dto';
import { InitiatePaymentDTO } from './dto/initiate-payment.dto';
import { PaymentWebhookDTO } from './dto/payment-webhook.dto';
import { PaymentResponseDto } from './dto/response-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiate(
    @CurrentUser() user: SelectUser,
    @Body() dto: InitiatePaymentDTO
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.initiate(user, dto);
  }

  /**
   * Pembayaran OFFLINE di kasir (POS) — langsung melunasi order.
   * `method`: CASH | CARD | QRIS | TRANSFER; settlement EDC/QRIS/transfer
   * terjadi di luar sistem, backend hanya mencatat (+ `reference` opsional).
   */
  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'super_admin')
  async payManual(
    @CurrentUser() user: SelectUser,
    @Body() dto: PayManualDTO
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.payManual(dto, user.id);
  }

  /** Refund penuh order PAID (+ restock opsional). */
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'super_admin')
  async refund(
    @CurrentUser() user: SelectUser,
    @Body() dto: RefundOrderDTO
  ): Promise<OrderResponseDto> {
    return this.paymentsService.refund(dto, user.id);
  }

  /**
   * Webhook provider; selalu 200 bila diproses (provider tidak retry).
   * Publik karena dipanggil sistem eksternal — keamanannya verifikasi
   * signature HMAC di PaymentsService, bukan sesi user.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Body() dto: PaymentWebhookDTO
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.handleWebhook(provider, dto);
  }
}
