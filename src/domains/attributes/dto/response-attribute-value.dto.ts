import { Expose } from 'class-transformer';

export class AttributeValueResponseDto {
  @Expose()
  id: number;

  @Expose()
  attributeId: number;

  @Expose()
  value: string;

  @Expose()
  displayValue: string | null;

  @Expose()
  colorHex: string | null;

  @Expose()
  sortOrder: number;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<AttributeValueResponseDto>) {
    Object.assign(this, partial);
  }
}
