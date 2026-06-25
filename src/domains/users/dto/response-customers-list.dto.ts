import { Expose } from 'class-transformer';
import { UserResponseDto } from './response-user.dto';

class Verified {
  @Expose()
  emailIsVerified: boolean | null;

  @Expose()
  phoneIsVerified: boolean | null;
}

class Address {
  @Expose()
  city: string | null;

  @Expose()
  province: string | null;

  @Expose()
  phone: string | null;
}

export class ResponseCustomersListDTO extends UserResponseDto {
  @Expose()
  verified: Verified | null;

  @Expose()
  address: Address | null;

  constructor(partial: ResponseCustomersListDTO) {
    super(partial);
    Object.assign(this, partial);
  }
}
