import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  InserOtp,
  OtpPurpose,
  schema,
} from '../../infrastructure/database/schema';
import {
  otpVerifications,
  SelectOtp,
} from '../../infrastructure/database/schema/otp-verification.entity';

@Injectable()
export class OtpRepository {
  constructor(private readonly database: DatabaseService) {}

  private async delOtp(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.database.db
      .delete(schema.otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.purpose, purpose)
        )
      );
  }

  async saveOtp(payload: InserOtp): Promise<SelectOtp> {
    await this.delOtp(payload.userId, payload.purpose);

    const [otp] = await this.database.db
      .insert(schema.otpVerifications)
      .values(payload)
      .returning();

    if (!otp) {
      throw new Error('tess');
    }

    return otp;
  }

  async findOneOtp(
    userId: string,
    purpose: OtpPurpose
  ): Promise<SelectOtp | null> {
    const otp = await this.database.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, userId),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.isUsed, false)
      ),
    });

    return otp ?? null;
  }

  async incrementAttempts(otpId: string): Promise<number> {
    const [updated] = await this.database.db
      .update(otpVerifications)
      .set({ attempts: sql`${otpVerifications.attempts} + 1` })
      .where(eq(otpVerifications.id, otpId))
      .returning({ attempts: otpVerifications.attempts });

    return updated.attempts;
  }

  async setOtpIsUsed(otpId: string): Promise<void> {
    await this.database.db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otpId));
  }
}
