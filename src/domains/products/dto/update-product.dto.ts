import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDTO } from './create-product.dto';

/** Update product: semua field opsional (createdBy memang tak pernah di DTO). */
export class UpdateProductDTO extends PartialType(CreateProductDTO) {}
