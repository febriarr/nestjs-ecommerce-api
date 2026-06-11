import { IsOptional, IsUUID } from 'class-validator';

/** Aktor pengiriman transfer (untuk jejak audit). */
export class SendTransferDTO {
  @IsOptional()
  @IsUUID()
  sentBy?: string;
}

/** Aktor penerimaan transfer (untuk jejak audit). */
export class ReceiveTransferDTO {
  @IsOptional()
  @IsUUID()
  receivedBy?: string;
}
