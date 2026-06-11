import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { OutletOpeningHours } from '../../../infrastructure/database/schema';

export class CreateOutletDTO {
  @IsString()
  @MaxLength(150)
  name: string;

  /** Kode unik internal cabang; huruf/angka/dash, disimpan uppercase. */
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'code hanya boleh huruf, angka, dan tanda hubung',
  })
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  code: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /** Koordinat sebagai string desimal (mengikuti kolom decimal di schema). */
  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  servesOnline?: boolean;

  @IsOptional()
  @IsBoolean()
  isOnlineDefault?: boolean;

  @IsOptional()
  @IsObject()
  openingHours?: OutletOpeningHours;
}
