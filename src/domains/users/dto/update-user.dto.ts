import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  roleEnum,
  statusEnum,
  type Role,
  type Status,
} from '../../../infrastructure/database/schema/users.entity';

class InAppPreferenceDTO {
  @IsBoolean()
  push: boolean;

  @IsBoolean()
  orderUpdate: boolean;

  @IsBoolean()
  promo: boolean;
}

/** Preferensi notifikasi — dikirim utuh (jsonb diganti seluruhnya). */
export class NotificationPrefDTO {
  @IsBoolean()
  email: boolean;

  @IsBoolean()
  whatsapp: boolean;

  @ValidateNested()
  @Type(() => InAppPreferenceDTO)
  inAppPreference: InAppPreferenceDTO;
}

/**
 * Update profil + atribut admin (role/status). Password TIDAK lewat sini —
 * pakai PATCH /users/:id/password agar verifikasi password lama terjaga.
 */
export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar harus berupa URL valid' })
  avatar?: string;

  @IsOptional()
  @IsIn(roleEnum.enumValues, { message: 'Role tidak valid' })
  role?: Role;

  @IsOptional()
  @IsIn(statusEnum.enumValues, { message: 'Status tidak valid' })
  status?: Status;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPrefDTO)
  notificationPref?: NotificationPrefDTO;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  outletId?: number;
}
