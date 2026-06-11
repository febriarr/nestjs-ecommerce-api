import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OrderQueueProducer } from './orders.queue';
import { OrdersProcessor } from './orders.processor';
import { OutletsModule } from '../outlets/outlets.module';
import { CartModule } from '../cart/cart.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ORDER_QUEUE } from '../../infrastructure/queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: ORDER_QUEUE }),
    OutletsModule,
    CartModule,
    InvoicesModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    OrderQueueProducer,
    OrdersProcessor,
  ],
  // OrdersService (markPaid) & OrdersRepository (lookup order) dipakai payments.
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
