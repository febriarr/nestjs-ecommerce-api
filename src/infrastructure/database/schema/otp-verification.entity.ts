import {
  text,
  boolean,
  uuid,
  pgEnum,
  pgTable,
  index,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users.entity';
import { uuidv7 } from 'uuidv7';

export const otpPurposeEnum = pgEnum('otp-purpose', [
  'EMAIL_VERIFICATION',
  'PHONE_VERIFICATION',
  'PASSWORD_RESET',
  'TWO_FACTOR_AUTH',
]);

export type OtpPurpose = (typeof otpPurposeEnum.enumValues)[number];

export const otpVerifications = pgTable(
  'otp_verifications',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    purpose: otpPurposeEnum('purpose').notNull(),
    code: text('code').notNull(),
    target: text('target').notNull(),
    isUsed: boolean('is_used').default(false).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('otp_verifications_user_id_idx').on(table.userId),
    index('otp_verifications_expires_at_idx').on(table.expiresAt),
  ]
);

export type SelectOtp = typeof otpVerifications.$inferSelect;

export type InserOtp = typeof otpVerifications.$inferInsert;
