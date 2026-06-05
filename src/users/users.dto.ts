import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { type Status, type Role } from 'src/database/schema/user.entity';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(255)
  password: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar harus berupa URL valid' })
  avatar?: string;

  @IsOptional()
  @IsEnum(['super_admin', 'admin', 'customer'] as const, {
    message: 'Role tidak valid',
  })
  role?: Role;
}

class NotificationPrefDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  inAppPreference?: Record<string, unknown>;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Avatar harus berupa URL valid' })
  avatar?: string;

  @IsOptional()
  @IsEnum(['super_admin', 'admin', 'customer'] as const, {
    message: 'Role tidak valid',
  })
  role?: Role;

  @IsOptional()
  @IsEnum(['active', 'suspended'] as const, {
    message: 'Status tidak valid',
  })
  status?: Status;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPrefDto)
  notificationPref?: NotificationPrefDto;
}
