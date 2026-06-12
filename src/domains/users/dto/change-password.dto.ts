import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDTO {
  /**
   * Wajib bila user sudah punya password; boleh kosong untuk akun OAuth
   * yang baru pertama kali menyetel password.
   */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(255)
  newPassword: string;
}
