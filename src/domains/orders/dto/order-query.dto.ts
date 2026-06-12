import { IsIn, IsOptional } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import { orderStatusEnum } from '../../../infrastructure/database/schema';

/** List order milik user login (identitas dari Bearer token). */
export class OrderQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @IsIn(orderStatusEnum.enumValues)
  status?: (typeof orderStatusEnum.enumValues)[number];
}
