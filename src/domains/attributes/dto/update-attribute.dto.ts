import { PartialType } from '@nestjs/mapped-types';
import { CreateAttributeDTO } from './create-attribute.dto';

export class UpdateAttributeDTO extends PartialType(CreateAttributeDTO) {}
