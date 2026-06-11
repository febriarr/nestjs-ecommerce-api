import { Expose } from 'class-transformer';

export interface OutletOptionItemAvailability {
  variantId: number;
  requested: number;
  availableStock: number;
}

/**
 * Outlet yang SANGGUP memenuhi seluruh item cart (hanya yang servesOnline),
 * terurut dari yang paling direkomendasikan.
 */
export class OutletOptionResponseDto {
  @Expose()
  outletId: number;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  city: string | null;

  @Expose()
  province: string | null;

  /** Jarak ke alamat kirim (km); null bila koordinat tidak lengkap. */
  @Expose()
  distanceKm: number | null;

  @Expose()
  isOnlineDefault: boolean;

  @Expose()
  items: OutletOptionItemAvailability[];

  constructor(partial: Partial<OutletOptionResponseDto>) {
    Object.assign(this, partial);
  }
}
