import { IsInt, Min } from 'class-validator';

/** Input satu item PO (dipakai create PO inline & tambah item saat DRAFT). */
export class PoItemInputDTO {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  qtyOrdered: number;

  /** Harga beli satuan (Rupiah penuh). */
  @IsInt()
  @Min(0)
  unitCost: number;
}
