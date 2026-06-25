import { Expose, Type } from 'class-transformer';
import { UserOutletResponseDTO, UserResponseDto } from './response-user.dto';

export class UserListResponseDTO extends UserResponseDto {
  @Expose()
  outletId: number | null;

  @Expose()
  @Type(() => UserOutletResponseDTO)
  outlet: UserOutletResponseDTO | null;

  constructor(partial: Partial<UserListResponseDTO>) {
    super(partial);
    Object.assign(this, partial);
  }
}
