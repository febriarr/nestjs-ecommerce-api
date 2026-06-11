import { PartialType } from '@nestjs/mapped-types';
import { CreateOutletDTO } from './create-outlet.dto';

export class UpdateOutletDTO extends PartialType(CreateOutletDTO) {}
