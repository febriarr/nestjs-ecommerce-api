import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceQueueProducer } from './invoices.queue';
import { InvoicesProcessor } from './invoices.processor';
import { PdfModule } from '../../infrastructure/pdf/pdf.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { MailModule } from '../../infrastructure/mail/mail.module';
import { CompanyConfigService } from '../../infrastructure/config/company.config';
import { INVOICE_QUEUE } from '../../infrastructure/queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: INVOICE_QUEUE }),
    PdfModule,
    StorageModule,
    MailModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesRepository,
    InvoiceQueueProducer,
    InvoicesProcessor,
    CompanyConfigService,
  ],
})
export class InvoicesModule {}
