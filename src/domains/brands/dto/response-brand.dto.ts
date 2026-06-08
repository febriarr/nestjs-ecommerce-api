import { Expose } from 'class-transformer';

export class BrandResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  /** Key objek logo di storage (referensi kanonik). */
  @Expose()
  logo: string | null;

  /** URL publik logo (null bila brand tidak punya logo). */
  @Expose()
  logoUrl: string | null;

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
