import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import { stockTransferStatusEnum } from '../../../infrastructure/database/schema';

export class TransferQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @IsIn(stockTransferStatusEnum.enumValues)
  status?: (typeof stockTransferStatusEnum.enumValues)[number];

  /** Filter outlet asal ATAU tujuan. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId?: number;
}
