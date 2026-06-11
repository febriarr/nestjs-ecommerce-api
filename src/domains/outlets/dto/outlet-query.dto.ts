import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CursorQueryDTO } from '../../../common/dto/cursor-query.dto';

/** Ubah string query ("true"/"false") menjadi boolean. */
function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class OutletQueryDTO extends CursorQueryDTO {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  servesOnline?: boolean;

  /** Cari pada nama/kode/kota. */
  @IsOptional()
  @IsString()
  search?: string;
}
