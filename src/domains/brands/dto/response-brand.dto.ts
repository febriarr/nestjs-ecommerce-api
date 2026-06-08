import { Expose } from 'class-transformer';

export class BrandResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  logo: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<BrandResponseDto>) {
    Object.assign(this, partial);
  }
}
