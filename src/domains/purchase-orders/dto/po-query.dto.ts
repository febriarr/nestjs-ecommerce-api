import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';
import { purchaseOrderStatusEnum } from '../../../infrastructure/database/schema';

export class PurchaseOrderQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @IsIn(purchaseOrderStatusEnum.enumValues)
  status?: (typeof purchaseOrderStatusEnum.enumValues)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  outletId?: number;
}
