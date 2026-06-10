import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountDTO } from './create-discount.dto';

export class UpdateDiscountDTO extends PartialType(CreateDiscountDTO) {}
