import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDTO } from './create-purchase-order.dto';

/** Update header PO — hanya saat DRAFT; item lewat endpoint items. */
export class UpdatePurchaseOrderDTO extends PartialType(
  OmitType(CreatePurchaseOrderDTO, ['items'] as const)
) {}
