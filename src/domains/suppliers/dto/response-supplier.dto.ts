import { Expose } from 'class-transformer';

export class SupplierResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  contactName: string | null;

  @Expose()
  phone: string | null;

  @Expose()
  email: string | null;

  @Expose()
  address: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<SupplierResponseDto>) {
    Object.assign(this, partial);
  }
}
