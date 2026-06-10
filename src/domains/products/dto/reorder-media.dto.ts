import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class MediaSortItemDTO {
  @IsInt()
  mediaId: number;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderMediaDTO {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MediaSortItemDTO)
  items: MediaSortItemDTO[];
}
