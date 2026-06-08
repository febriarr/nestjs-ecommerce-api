import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { PdfModule } from '../../infrastructure/pdf/pdf.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CompanyConfigService } from '../../infrastructure/config/company.config';

@Module({
  imports: [PdfModule, StorageModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository, CompanyConfigService],
})
export class InvoicesModule {}
