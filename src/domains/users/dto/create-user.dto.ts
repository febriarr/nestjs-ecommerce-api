import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  roleEnum,
  type Role,
} from '../../../infrastructure/database/schema/users.entity';

export class CreateUserDTO {
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

  @IsOptional()
  @IsUrl({}, { message: 'Avatar harus berupa URL valid' })
  avatar?: string;

  @IsOptional()
  @IsIn(roleEnum.enumValues, { message: 'Role tidak valid' })
  role?: Role;
}
