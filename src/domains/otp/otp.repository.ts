import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { InserOtp, OtpPurpose } from '../../infrastructure/database/schema';
import {
  otpVerifications,
  SelectOtp,
} from '../../infrastructure/database/schema/otp-verification.entity';
import { BaseRepository } from '../../common/abstracts/base.repository';

@Injectable()
export class OtpRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  private async delOtp(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.db
      .delete(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.purpose, purpose)
        )
      );
  }

  async saveOtp(payload: InserOtp): Promise<SelectOtp> {
    await this.delOtp(payload.userId, payload.purpose);

    const [otp] = await this.db
      .insert(otpVerifications)
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
    const otp = await this.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.userId, userId),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.isUsed, false)
      ),
    });

    return otp ?? null;
  }

  async incrementAttempts(otpId: string): Promise<number> {
    const [updated] = await this.db
      .update(otpVerifications)
      .set({ attempts: sql`${otpVerifications.attempts} + 1` })
      .where(eq(otpVerifications.id, otpId))
      .returning({ attempts: otpVerifications.attempts });

    return updated.attempts;
  }

  async setOtpIsUsed(otpId: string): Promise<void> {
    await this.db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otpId));
  }
}
