import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './infrastructure/database/database.module';
import { UsersModule } from './domains/users/users.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { MailModule } from './infrastructure/mail/mail.module';
import { AuthModule } from './domains/auth/auth.module';
import { OtpModule } from './domains/otp/otp.module';
import { SessionsModule } from './domains/sessions/sessions.module';
import { BrandsModule } from './domains/brands/brands.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { ImageProcessingModule } from './infrastructure/image-processing/image-processing.module';
import { PdfModule } from './infrastructure/pdf/pdf.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { InvoicesModule } from './domains/invoices/invoices.module';
import { ProductsModule } from './domains/products/products.module';
import { CategoriesModule } from './domains/categories/categories.module';
import { AttributesModule } from './domains/attributes/attributes.module';
import { OutletsModule } from './domains/outlets/outlets.module';
import { CartModule } from './domains/cart/cart.module';
import { OrdersModule } from './domains/orders/orders.module';
import { PaymentsModule } from './domains/payments/payments.module';
import { SuppliersModule } from './domains/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './domains/purchase-orders/purchase-orders.module';
import { StockTransfersModule } from './domains/stock-transfers/stock-transfers.module';
import { AnalyticsModule } from './domains/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limit default seluruh API: 100 request/menit per IP (tuning knob).
    // Endpoint sensitif (login/register/google, webhook) lebih ketat via
    // @Throttle di controller; pelanggaran → 429 RATE_LIMIT_EXCEEDED
    // (sudah ditangani AppExceptionFilter).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    UsersModule,
    MailModule,
    AuthModule,
    OtpModule,
    SessionsModule,
    BrandsModule,
    StorageModule,
    ImageProcessingModule,
    PdfModule,
    QueueModule,
    InvoicesModule,
    ProductsModule,
    CategoriesModule,
    AttributesModule,
    OutletsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    StockTransfersModule,
    AnalyticsModule,
  ],
  providers: [
    // Rate limiting berlaku untuk SEMUA route (termasuk @Public) — guard
    // auth/roles terdaftar di AuthModule.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
