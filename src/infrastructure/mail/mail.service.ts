import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('RESEND_FROM_EMAIL');
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
