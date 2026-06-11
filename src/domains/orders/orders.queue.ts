import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DEFAULT_JOB_OPTIONS,
  ORDER_JOB,
  ORDER_QUEUE,
  OrderJobData,
} from '../../infrastructure/queue/queue.constants';

/** Producer job order — memisahkan "enqueue" dari business logic. */
@Injectable()
export class OrderQueueProducer {
  constructor(
    @InjectQueue(ORDER_QUEUE) private readonly queue: Queue<OrderJobData>
  ) {}

  /** Jadwalkan auto-expire reservasi stok setelah `delayMs` (TTL pembayaran). */
  async enqueueExpire(orderId: string, delayMs: number): Promise<void> {
    await this.queue.add(
      ORDER_JOB.EXPIRE,
      { orderId },
      { ...DEFAULT_JOB_OPTIONS, delay: delayMs }
    );
  }
}
