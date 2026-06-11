import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import { orderStatusEnum } from '../../../infrastructure/database/schema';

export class OrderQueryDTO extends CursorQueryDTO {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(orderStatusEnum.enumValues)
  status?: (typeof orderStatusEnum.enumValues)[number];
}
