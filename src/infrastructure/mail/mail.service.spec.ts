import { ConfigService } from '@nestjs/config';
import { MailService, SendInvoiceParams } from './mail.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const config = {
  getOrThrow: jest.fn().mockReturnValue('no-reply@example.com'),
} as unknown as ConfigService;

const params: SendInvoiceParams = {
  to: 'john@example.com',
  customerName: 'John',
  invoiceNumber: 'INV-1',
  pdf: Buffer.from('pdf'),
  isFullyPaid: true,
  total: 100000,
  amountPaid: 100000,
  amountDue: 0,
};

describe('MailService.sendInvoice', () => {
  let service: MailService;

  beforeEach(() => {
    mockSend.mockReset();
    service = new MailService(config);
  });

  it('mengirim email lunas dengan lampiran PDF', async () => {
    mockSend.mockResolvedValue({ error: null });
    await service.sendInvoice(params);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Lunas'),
        attachments: [
          expect.objectContaining({
            filename: 'INV-1.pdf',
            content: params.pdf,
          }),
        ],
      })
    );
  });

  it('subjek berbeda untuk pembayaran sebagian', async () => {
    mockSend.mockResolvedValue({ error: null });
    await service.sendInvoice({ ...params, isFullyPaid: false, amountDue: 50000 });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Sebagian'),
      })
    );
  });

  it('melempar error bila Resend gagal (agar job retry)', async () => {
    mockSend.mockResolvedValue({ error: { message: 'boom' } });
    await expect(service.sendInvoice(params)).rejects.toThrow('boom');
  });
});
