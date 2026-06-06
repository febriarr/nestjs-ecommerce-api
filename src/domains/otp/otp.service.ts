import { Injectable } from '@nestjs/common';
import { OtpRepository } from './otp.repository';
import { OtpPurpose } from '../../infrastructure/database/schema';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  OtpExpiredException,
  OtpInvalidException,
  OtpMaxAttemptsException,
  OtpPurposeMismatchException,
} from '../../common/exceptions/domains/otp.exceptions';

@Injectable()
export class OtpService {
  constructor(private readonly otpRepository: OtpRepository) {}

  async generateOtp(
    userId: string,
    target: string,
    purpose: OtpPurpose
  ): Promise<string> {
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); //v10 menit

    await this.otpRepository.saveOtp({
      userId,
      purpose,
      code: hashedCode,
      target,
      expiresAt,
    });

    return code; // plain code dikirim via email
  }

  async verifyOtp(
    userId: string,
    code: string,
    purpose: OtpPurpose
  ): Promise<boolean> {
    const otp = await this.otpRepository.findOneOtp(userId, purpose);

    if (!otp) {
      throw OtpInvalidException();
    }

    if (otp.purpose !== purpose) throw OtpPurposeMismatchException();

    if (otp.expiresAt < new Date()) {
      throw OtpExpiredException();
    }

    const isValid = await bcrypt.compare(code, otp.code);
    if (!isValid) {
      const attempts = await this.otpRepository.incrementAttempts(otp.id);
      if (attempts >= 5) throw OtpMaxAttemptsException();
      throw OtpInvalidException();
    }

    await this.otpRepository.setOtpIsUsed(otp.id);

    return true;
  }
}
