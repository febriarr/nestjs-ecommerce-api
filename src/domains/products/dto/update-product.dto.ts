import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateProductDTO } from './create-product.dto';

/** Update product: semua opsional, kecuali `createdBy` yang tidak boleh diubah. */
export class UpdateProductDTO extends PartialType(
  OmitType(CreateProductDTO, ['createdBy'] as const)
) {}
