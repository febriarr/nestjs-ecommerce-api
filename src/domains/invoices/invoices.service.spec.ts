import { ConfigService } from '@nestjs/config';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceQueueProducer } from './invoices.queue';
import { MailService } from '../../infrastructure/mail/mail.service';
import { CompanyConfigService } from '../../infrastructure/config/company.config';
import { PdfGenerator } from '../../infrastructure/pdf/pdf-generator.interface';
import { StorageProvider } from '../../infrastructure/storage/storage-provider.interface';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectInvoices } from '../../infrastructure/database/schema';

function invoice(overrides: Partial<SelectInvoices> = {}): SelectInvoices {
  return {
    id: 'inv-uuid',
    invoiceNumber: 'INV-1',
    issueDate: new Date(),
    customerName: 'John',
    customerEmail: 'john@example.com',
    items: [
      { description: 'A', quantity: 1, unitPrice: 1000, lineTotal: 1000 },
    ],
    subtotal: 1000,
    total: 1000,
    status: 'UNPAID',
    amountPaid: 0,
    dueDate: null,
    paidAt: null,
    pdfKey: null,
    pdfStatus: 'PENDING',
    emailStatus: 'PENDING',
    sentAt: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('InvoicesService', () => {
  let repo: jest.Mocked<InvoicesRepository>;
  let queueProducer: jest.Mocked<InvoiceQueueProducer>;
  let service: InvoicesService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByNumber: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<InvoicesRepository>;
    queueProducer = {
      enqueueGeneratePdf: jest.fn(),
      enqueueSendEmail: jest.fn(),
    } as unknown as jest.Mocked<InvoiceQueueProducer>;

    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://cdn.example.com'),
    } as unknown as ConfigService;

    service = new InvoicesService(
      repo,
      {} as CompanyConfigService,
      config,
      queueProducer,
      {} as MailService,
      {} as PdfGenerator,
      {} as StorageProvider
    );
  });

  describe('createInvoice', () => {
    it('menghitung subtotal & total dari item', async () => {
      repo.insert.mockImplementation((payload) =>
        Promise.resolve(invoice(payload as Partial<SelectInvoices>))
      );
      const result = await service.createInvoice({
        customerName: 'John',
        customerEmail: 'john@example.com',
        items: [
          { description: 'A', quantity: 2, unitPrice: 5000 },
          { description: 'B', quantity: 1, unitPrice: 3000 },
        ],
      });
      expect(result.subtotal).toBe(13000);
      expect(result.total).toBe(13000);
    });
  });

  describe('updatePaymentStatus', () => {
    it('PAID memicu pipeline generate PDF', async () => {
      repo.findById.mockResolvedValue(invoice());
      repo.update.mockResolvedValue(
        invoice({ status: 'PAID', paidAt: new Date() })
      );
      await service.updatePaymentStatus('inv-uuid', { status: 'PAID' });
      expect(queueProducer.enqueueGeneratePdf).toHaveBeenCalledWith('inv-uuid');
    });

    it('idempotent bila sudah PAID (tidak enqueue ulang)', async () => {
      repo.findById.mockResolvedValue(invoice({ status: 'PAID' }));
      await service.updatePaymentStatus('inv-uuid', { status: 'PAID' });
      expect(queueProducer.enqueueGeneratePdf).not.toHaveBeenCalled();
    });

    it('menolak transisi dari VOID', async () => {
      repo.findById.mockResolvedValue(invoice({ status: 'VOID' }));
      await expect(
        service.updatePaymentStatus('inv-uuid', { status: 'PAID' })
      ).rejects.toBeInstanceOf(AppException);
    });

    it('menolak PARTIALLY_PAID tanpa amountPaid', async () => {
      repo.findById.mockResolvedValue(invoice());
      await expect(
        service.updatePaymentStatus('inv-uuid', { status: 'PARTIALLY_PAID' })
      ).rejects.toBeInstanceOf(AppException);
    });

    it('menolak PAID dengan amountPaid < total', async () => {
      repo.findById.mockResolvedValue(invoice({ total: 10000 }));
      await expect(
        service.updatePaymentStatus('inv-uuid', {
          status: 'PAID',
          amountPaid: 5000,
        })
      ).rejects.toBeInstanceOf(AppException);
    });

    it('melempar bila invoice tidak ditemukan', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.updatePaymentStatus('x', { status: 'PAID' })
      ).rejects.toBeInstanceOf(AppException);
    });
  });
});
