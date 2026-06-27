import { Expose, Type } from 'class-transformer';
import type { AttributeType } from '../../../infrastructure/database/schema';
import { AttributeValueResponseDto } from './response-attribute-value.dto';

export class AttributeResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  displayName: string;

  @Expose()
  type: AttributeType;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<AttributeResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AttributeWithValuesResponseDto extends AttributeResponseDto {
  @Expose()
  @Type(() => AttributeValueResponseDto)
  values: AttributeValueResponseDto[];

  constructor(partial: Partial<AttributeWithValuesResponseDto>) {
    super(partial);

    this.values =
      partial.values?.map((v) => new AttributeValueResponseDto(v)) ?? [];
  }
}
