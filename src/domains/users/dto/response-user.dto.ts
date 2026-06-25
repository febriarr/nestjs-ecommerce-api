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

export class UserOutletResponseDTO {
  @Expose()
  code: string;
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
  createdAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
