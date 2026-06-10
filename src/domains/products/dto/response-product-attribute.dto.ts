import { Expose } from 'class-transformer';

export class ProductAttributeResponseDto {
  @Expose()
  id: number;

  @Expose()
  productId: number;

  @Expose()
  attributeId: number;

  @Expose()
  isRequired: boolean;

  @Expose()
  sortOrder: number;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<ProductAttributeResponseDto>) {
    Object.assign(this, partial);
  }
}
