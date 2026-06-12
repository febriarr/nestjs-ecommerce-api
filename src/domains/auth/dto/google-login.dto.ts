import { IsNotEmpty, IsString } from 'class-validator';

/** Login Google: `credential` = ID token JWT dari Google Identity Services. */
export class GoogleLoginDTO {
  @IsString()
  @IsNotEmpty()
  credential: string;
}
