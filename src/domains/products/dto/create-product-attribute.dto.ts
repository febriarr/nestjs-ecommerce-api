import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateProductAttributeDTO {
  @IsInt()
  attributeId: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
