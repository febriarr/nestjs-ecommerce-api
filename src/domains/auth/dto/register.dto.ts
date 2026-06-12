import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Registrasi publik — SENGAJA tanpa field `role` (selalu customer) agar
 * tidak ada jalur eskalasi; pembuatan admin lewat POST /users (internal).
 */
export class RegisterDTO {
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
  @IsString()
  @MaxLength(20)
  phone?: string;
}
