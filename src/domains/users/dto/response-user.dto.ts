import { Expose } from 'class-transformer';
import type {
  Role,
  Status,
} from '../../../infrastructure/database/schema/users.entity';

export interface NotificationPrefResponse {
  email: boolean;
  whatsapp: boolean;
  inAppPreference: {
    push: boolean;
    orderUpdate: boolean;
    promo: boolean;
  };
}

/** Profil user tanpa field sensitif (password, oauthMetadata). */
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  phone: string | null;

  @Expose()
  avatar: string | null;

  @Expose()
  role: Role;

  @Expose()
  status: Status;

  @Expose()
  emailIsVerified: boolean | null;

  @Expose()
  phoneIsVerified: boolean | null;

  @Expose()
  notificationPref: NotificationPrefResponse | null;

  @Expose()
  lastLoginAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
