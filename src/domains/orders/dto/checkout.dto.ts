import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

/** Checkout order ONLINE dari cart user login (identitas dari Bearer token). */
export class CheckoutDTO {
  /** Alamat kirim: id user_contacts milik user. */
  @IsUUID()
  contactId: string;

  /**
   * Override outlet manual (opsional). Bila kosong, outlet dipilih otomatis:
   * sanggup memenuhi semua item → terdekat → fallback isOnlineDefault.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  outletId?: number;

  /** Ongkir dalam Rupiah penuh (integrasi kurir belum ada; default 0). */
  @IsOptional()
  @IsInt()
  @Min(0)
  shippingFee?: number;
}
