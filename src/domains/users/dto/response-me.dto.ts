import { Expose } from 'class-transformer';
import { UserOutletResponseDTO, UserResponseDto } from './response-user.dto';
import { NotificationPrefDTO } from './update-user.dto';

export class ResponseMeDTO extends UserResponseDto {
  @Expose()
  notificationPref: NotificationPrefDTO | null;

  @Expose()
  emailIsVerified: boolean | null;

  @Expose()
  phoneIsVerified: boolean | null;

  @Expose()
  outletId: number | null;

  @Expose()
  outlet: UserOutletResponseDTO | null;

  constructor(partial: ResponseMeDTO) {
    super(partial);
    Object.assign(this, partial);
  }
}
