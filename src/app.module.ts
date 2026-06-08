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
import { InvoicesModule } from './domains/invoices/invoices.module';

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
    InvoicesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
