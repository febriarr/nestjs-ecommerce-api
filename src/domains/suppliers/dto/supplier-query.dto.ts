import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class SupplierQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  /** Cari pada nama/kode. */
  @IsOptional()
  @IsString()
  search?: string;
}
