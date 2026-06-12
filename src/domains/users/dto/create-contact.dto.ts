import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Alamat pengiriman milik user (user_contacts). */
export class CreateContactDTO {
  /** Label bebas: 'Rumah', 'Kantor', 'Kos', dll. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  /** Nama penerima — boleh berbeda dari nama user. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  recipientName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneAlt?: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  /** Kecamatan. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district: string;

  /** Kota/kabupaten. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  /** Koordinat string desimal (mengikuti kolom decimal di schema). */
  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @IsOptional()
  @IsLongitude()
  longitude?: string;

  /** Catatan untuk kurir. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
