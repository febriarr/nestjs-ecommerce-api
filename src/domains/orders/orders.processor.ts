import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  ORDER_JOB,
  ORDER_QUEUE,
  ORDER_WORKER_CONCURRENCY,
  OrderJobData,
} from '../../infrastructure/queue/queue.constants';
import { OrdersService } from './orders.service';

/**
 * Worker queue order. Saat ini satu job: EXPIRE — lepas reservasi stok dan
 * tandai EXPIRED bila order masih PENDING saat TTL pembayaran habis
 * (no-op aman bila sudah PAID/CANCELLED).
 */
@Processor(ORDER_QUEUE, { concurrency: ORDER_WORKER_CONCURRENCY })
export class OrdersProcessor extends WorkerHost {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(private readonly ordersService: OrdersService) {
    super();
  }

  async process(job: Job<OrderJobData>): Promise<void> {
    const { orderId } = job.data;

    switch (job.name) {
      case ORDER_JOB.EXPIRE:
        await this.ordersService.expireIfPending(orderId);
        return;
      default:
        this.logger.warn(`Job order tidak dikenal: ${job.name}`);
        return;
    }
  }
}
