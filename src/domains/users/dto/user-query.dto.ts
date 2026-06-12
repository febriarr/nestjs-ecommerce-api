import { IsIn, IsOptional, IsString } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import {
  roleEnum,
  statusEnum,
} from '../../../infrastructure/database/schema/users.entity';

export class UserQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @IsIn(roleEnum.enumValues)
  role?: (typeof roleEnum.enumValues)[number];

  @IsOptional()
  @IsIn(statusEnum.enumValues)
  status?: (typeof statusEnum.enumValues)[number];

  /** Cari pada nama/email. */
  @IsOptional()
  @IsString()
  search?: string;
}
