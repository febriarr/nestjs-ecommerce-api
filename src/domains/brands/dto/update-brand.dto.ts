import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandDTO } from './create-brand.dto';

export class UpdateBrandDTO extends PartialType(CreateBrandDTO) {}
