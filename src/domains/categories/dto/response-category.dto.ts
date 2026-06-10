import { Expose } from 'class-transformer';

export class CategoryResponseDto {
  @Expose()
  id: string;

  @Expose()
  parentId: string | null;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  description: string | null;

  /** Key gambar di storage (referensi kanonik). */
  @Expose()
  image: string | null;

  /** URL publik gambar (null bila tidak ada). */
  @Expose()
  imageUrl: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  sortOrder: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<CategoryResponseDto>) {
    Object.assign(this, partial);
  }
}

/** Node tree kategori (rekursif untuk endpoint /categories/tree). */
export class CategoryTreeDto extends CategoryResponseDto {
  @Expose()
  children: CategoryTreeDto[];

  constructor(partial: Partial<CategoryTreeDto>) {
    super(partial);
    this.children = partial.children ?? [];
  }
}
