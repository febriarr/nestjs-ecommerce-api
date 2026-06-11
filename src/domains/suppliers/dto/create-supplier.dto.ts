import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSupplierDTO {
  @IsString()
  @MaxLength(150)
  name: string;

  /** Kode unik internal pemasok; huruf/angka/dash, disimpan uppercase. */
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'code hanya boleh huruf, angka, dan tanda hubung',
  })
  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
