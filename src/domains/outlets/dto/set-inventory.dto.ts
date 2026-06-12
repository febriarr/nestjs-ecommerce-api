import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Set stok absolut sebuah variant pada sebuah outlet (upsert).
 * Tercatat di ledger sebagai ADJUSTMENT (delta dihitung otomatis) — untuk
 * stok opname/koreksi; barang datang dari pembelian lewat penerimaan PO.
 * Pelaku diambil dari user login (@CurrentUser), bukan body.
 */
export class SetInventoryDTO {
  @IsInt()
  @Min(0)
  stock: number;

  /** Alasan penyesuaian — tampil di jejak audit. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
