import { Expose } from 'class-transformer';
import type { AttributeType } from '../../../infrastructure/database/schema';

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
