import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuickReceiveItemDTO {
  @IsInt()
  @Min(1)
  variantId: number;

  /** Qty yang datang (= qty dipesan; tidak ada konsep sisa di alur kilat). */
  @IsInt()
  @Min(1)
  quantity: number;

  /** Harga beli satuan (Rupiah penuh). */
  @IsInt()
  @Min(0)
  unitCost: number;
}

/**
 * "Barang Masuk" satu langkah untuk UMKM yang belanja tanpa memesan dulu:
 * PO + submit + penerimaan (GRN) dibuat sekaligus dalam SATU transaksi.
 * PO tetap tercipta sebagai catatan internal (harga & jejak audit lengkap)
 * walau user tidak merasa sedang "membuat purchase order".
 */
export class QuickReceiveDTO {
  @IsInt()
  @Min(1)
  supplierId: number;

  @IsInt()
  @Min(1)
  outletId: number;

  // Penerima (= createdBy PO & receivedBy GRN) dari user login (@CurrentUser).

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuickReceiveItemDTO)
  items: QuickReceiveItemDTO[];
}
