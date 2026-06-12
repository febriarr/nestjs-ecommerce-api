import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SelectUser } from '../../infrastructure/database/schema';
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
   * Webhook provider; selalu 200 bila diproses (provider tidak retry).
   * Publik karena dipanggil sistem eksternal — keamanannya verifikasi
   * signature HMAC di PaymentsService, bukan sesi user.
   */
  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Body() dto: PaymentWebhookDTO
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.handleWebhook(provider, dto);
  }
}
