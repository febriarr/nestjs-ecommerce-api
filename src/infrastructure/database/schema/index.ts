// index.ts
import { otpPurposeEnum, otpVerifications } from './otp-verification.entity';
import { sessions } from './sessions.entity';
import { users, roleEnum, statusEnum, userContacts } from './users.entity';
import * as userRelations from './users.relations';

export const schema = {
  // User Schema
  users,
  roleEnum,
  statusEnum,
  userContacts,
  ...userRelations,
  otpVerifications,
  otpPurposeEnum,
  sessions,
} as const;

// Type

export type Schema = typeof schema;

// USERS

export type {
  SelectUser,
  InsertUser,
  UpdateUser,
  Role,
  Status,
} from './users.entity';

// OTP VERIFICATION
export type {
  OtpPurpose,
  InserOtp,
  SelectOtp,
} from './otp-verification.entity';

// SESSIONS
export type { InsertSessions, SelectSessions } from './sessions.entity';
