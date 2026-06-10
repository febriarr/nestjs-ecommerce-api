import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateVariantDTO } from './create-variant.dto';
import { variantStatusEnum } from '../../../infrastructure/database/schema';

/**
 * Update variant: field inti opsional. Perubahan kombinasi attribute
 * (attributeValueIds) tidak didukung di sini (ganti = buat variant baru).
 */
export class UpdateVariantDTO extends PartialType(
  OmitType(CreateVariantDTO, ['attributeValueIds'] as const)
) {
  @IsOptional()
  @IsIn(variantStatusEnum.enumValues)
  status?: (typeof variantStatusEnum.enumValues)[number];
}
