import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { attributeTypeEnum } from '../../../infrastructure/database/schema';

export class CreateAttributeDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  displayName: string;

  @IsIn(attributeTypeEnum.enumValues)
  type: (typeof attributeTypeEnum.enumValues)[number];
}
