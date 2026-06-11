import { Expose } from 'class-transformer';
import type { OutletOpeningHours } from '../../../infrastructure/database/schema';

export class OutletResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  street: string | null;

  @Expose()
  district: string | null;

  @Expose()
  city: string | null;

  @Expose()
  province: string | null;

  @Expose()
  postalCode: string | null;

  @Expose()
  phone: string | null;

  @Expose()
  email: string | null;

  @Expose()
  latitude: string | null;

  @Expose()
  longitude: string | null;

  @Expose()
  isActive: boolean;

  @Expose()
  servesOnline: boolean;

  @Expose()
  isOnlineDefault: boolean;

  @Expose()
  openingHours: OutletOpeningHours | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<OutletResponseDto>) {
    Object.assign(this, partial);
  }
}
