import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { DummyPaymentGateway } from './dummy-payment.gateway';
import { PAYMENT_GATEWAY } from './payment.constants';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    DummyPaymentGateway,
    // Ganti useExisting ke implementasi Midtrans/Xendit saat tersedia.
    { provide: PAYMENT_GATEWAY, useExisting: DummyPaymentGateway },
  ],
})
export class PaymentsModule {}
