import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderCategoryItemDTO {
  @IsUUID()
  id: string;

  @Transform(({ value }: { value: string | number }) =>
    value === undefined || value === '' ? undefined : Number(value)
  )
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderCategoriesDTO {
  @IsArray()
  @ArrayMinSize(2, { message: 'Harus mengirim tepat 2 item untuk ditukar' })
  @ArrayMaxSize(2, { message: 'Harus mengirim tepat 2 item untuk ditukar' })
  @ValidateNested({ each: true })
  @Type(() => ReorderCategoryItemDTO)
  items: [ReorderCategoryItemDTO, ReorderCategoryItemDTO];
}
