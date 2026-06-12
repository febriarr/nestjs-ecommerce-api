import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDTO {
  @IsEmail({}, { message: 'Email tidak valid' })
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
