import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
