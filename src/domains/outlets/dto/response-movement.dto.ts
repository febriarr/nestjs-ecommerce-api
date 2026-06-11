import { Expose } from 'class-transformer';
import type {
  StockMovementRefType,
  StockMovementType,
} from '../../../infrastructure/database/schema';

/** Satu baris jejak audit stok (append-only ledger). */
export class MovementResponseDto {
  @Expose()
  id: number;

  @Expose()
  outletId: number;

  @Expose()
  variantId: number;

  @Expose()
  type: StockMovementType;

  /** Perubahan stok fisik, bertanda. */
  @Expose()
  stockChange: number;

  /** Perubahan reservedStock, bertanda. */
  @Expose()
  reservedChange: number;

  @Expose()
  stockAfter: number;

  @Expose()
  reservedAfter: number;

  @Expose()
  refType: StockMovementRefType | null;

  @Expose()
  refId: string | null;

  @Expose()
  actorId: string | null;

  @Expose()
  note: string | null;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<MovementResponseDto>) {
    Object.assign(this, partial);
  }
}
