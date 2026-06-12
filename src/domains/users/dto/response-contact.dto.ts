import { Expose } from 'class-transformer';

export class ContactResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  label: string | null;

  @Expose()
  recipientName: string;

  @Expose()
  phone: string;

  @Expose()
  phoneAlt: string | null;

  @Expose()
  street: string;

  @Expose()
  district: string;

  @Expose()
  city: string;

  @Expose()
  province: string;

  @Expose()
  postalCode: string;

  @Expose()
  country: string;

  @Expose()
  latitude: string | null;

  @Expose()
  longitude: string | null;

  @Expose()
  notes: string | null;

  @Expose()
  isPrimary: boolean;

  @Expose()
  isActive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<ContactResponseDto>) {
    Object.assign(this, partial);
  }
}
