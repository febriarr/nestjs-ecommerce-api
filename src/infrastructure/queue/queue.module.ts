import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

/**
 * Konfigurasi koneksi Redis untuk BullMQ.
 *
 * `forRootAsync` bersifat global — koneksi ini dipakai oleh semua queue yang
 * didaftarkan via `BullModule.registerQueue` di module lain.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const password = config.get<string>('REDIS_PASSWORD');
        const db = config.get<string>('REDIS_DB');
        return {
          connection: {
            host: config.get<string>('REDIS_HOST') ?? 'localhost',
            port: Number(config.get<string>('REDIS_PORT') ?? '6379'),
            ...(password ? { password } : {}),
            ...(db ? { db: Number(db) } : {}),
          },
        };
      },
    }),
  ],
})
export class QueueModule {}
