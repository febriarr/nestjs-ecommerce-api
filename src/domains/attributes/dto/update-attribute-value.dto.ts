import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributeValueDTO } from './create-attribute-value.dto';

export class UpdateAttributeValueDTO extends PartialType(
  CreateAttributeValueDTO
) {}
