import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDTO } from './dto/initiate-payment.dto';
import { PaymentWebhookDTO } from './dto/payment-webhook.dto';
import { PaymentResponseDto } from './dto/response-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiate(@Body() dto: InitiatePaymentDTO): Promise<PaymentResponseDto> {
    return this.paymentsService.initiate(dto);
  }

  /** Webhook provider; selalu 200 bila diproses (provider tidak retry). */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Param('provider') provider: string,
    @Body() dto: PaymentWebhookDTO
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.handleWebhook(provider, dto);
  }
}
