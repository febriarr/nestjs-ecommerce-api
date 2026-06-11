import { IsUUID } from 'class-validator';

export class InitiatePaymentDTO {
  @IsUUID()
  orderId: string;
}
