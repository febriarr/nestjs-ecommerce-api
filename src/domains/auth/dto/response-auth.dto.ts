import { Expose } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/response-user.dto';

/** Hasil login/register: session token opaque + profil user. */
export class AuthResponseDto {
  /** Kirim sebagai header `Authorization: Bearer <token>`. */
  @Expose()
  token: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  user: UserResponseDto;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}

/** Sesi aktif user (token TIDAK pernah diekspos). */
export class SessionResponseDto {
  @Expose()
  id: string;

  @Expose()
  userAgent: string | null;

  @Expose()
  ipAddress: string | null;

  @Expose()
  lastActivityAt: Date;

  @Expose()
  expiresAt: Date;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<SessionResponseDto>) {
    Object.assign(this, partial);
  }
}
