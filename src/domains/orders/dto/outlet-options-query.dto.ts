import { IsOptional, IsUUID } from 'class-validator';

/** Evaluasi outlet yang sanggup memenuhi seluruh isi cart user login. */
export class OutletOptionsQueryDTO {
  /** Alamat kirim untuk ranking kedekatan (opsional). */
  @IsOptional()
  @IsUUID()
  contactId?: string;
}
