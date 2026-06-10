import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { formatRupiah } from '../../common/utils/currency.util';

export interface SendInvoiceParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  pdf: Buffer;
  /** True bila lunas penuh; false bila pembayaran sebagian (PARTIALLY_PAID). */
  isFullyPaid: boolean;
  total: number;
  amountPaid: number;
  amountDue: number;
}

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('RESEND_FROM_EMAIL');
  }

  /**
   * Kirim email invoice dengan lampiran PDF.
   *
   * Berbeda dengan {@link sendOtp}, method ini SENGAJA melempar error bila gagal
   * agar job BullMQ dapat melakukan retry.
   */
  async sendInvoice(params: SendInvoiceParams): Promise<void> {
    const { to, customerName, invoiceNumber, pdf, isFullyPaid } = params;

    const subject = isFullyPaid
      ? `Invoice ${invoiceNumber} - Lunas`
      : `Invoice ${invoiceNumber} - Pembayaran Sebagian`;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html: isFullyPaid
        ? this.buildPaidHtml(customerName, invoiceNumber)
        : this.buildPartiallyPaidHtml(customerName, invoiceNumber, params),
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
    });

    if (error) {
      this.logger.error(
        `Gagal mengirim email invoice ${invoiceNumber} ke ${to}`,
        error
      );
      throw new Error(`Resend gagal mengirim invoice: ${error.message}`);
    }
  }

  private buildPaidHtml(customerName: string, invoiceNumber: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Halo, ${customerName}!</h2>
        <p>
          Pembayaran Anda untuk invoice <strong>${invoiceNumber}</strong> telah
          <strong>LUNAS</strong> dan kami terima. Terima kasih.
        </p>
        <p style="color: #71717a; font-size: 14px;">
          Invoice resmi terlampir sebagai file PDF pada email ini.
        </p>
      </div>
    `;
  }

  private buildPartiallyPaidHtml(
    customerName: string,
    invoiceNumber: string,
    params: SendInvoiceParams
  ): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Halo, ${customerName}!</h2>
        <p>
          Kami telah menerima <strong>pembayaran sebagian</strong> untuk invoice
          <strong>${invoiceNumber}</strong>.
        </p>
        <table style="width: 100%; font-size: 14px; margin: 16px 0;">
          <tr>
            <td style="color: #71717a;">Total tagihan</td>
            <td style="text-align: right;">${formatRupiah(params.total)}</td>
          </tr>
          <tr>
            <td style="color: #71717a;">Sudah dibayar</td>
            <td style="text-align: right;">${formatRupiah(params.amountPaid)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Sisa tagihan</td>
            <td style="text-align: right; font-weight: bold;">
              ${formatRupiah(params.amountDue)}
            </td>
          </tr>
        </table>
        <p style="color: #71717a; font-size: 14px;">
          Rincian invoice terlampir sebagai file PDF pada email ini. Mohon
          melunasi sisa tagihan sebelum jatuh tempo.
        </p>
      </div>
    `;
  }

  async sendOtp(email: string, name: string, otp: string, purpose: string) {
    const subjectMap: Record<string, string> = {
      email_verification: 'Verify your email',
      login: 'Your login OTP',
      password_reset: 'Reset your password',
    };

    const subject = subjectMap[purpose] ?? 'Your OTP Code';

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Hi, ${name}!</h2>
            <p>${subject}</p>
            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              text-align: center;
              padding: 24px;
              background: #f4f4f5;
              border-radius: 8px;
              margin: 24px 0;
            ">
              ${otp}
            </div>
            <p style="color: #71717a; font-size: 14px;">
              This code expires in <strong>10 minutes</strong>.
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      // Jangan throw — jangan block flow auth karena email gagal
    }
  }
}
