import { PurchaseOrderStatus } from '../../infrastructure/database/schema';

/**
 * Status PO hasil sebuah penerimaan: RECEIVED bila SEMUA item sudah terpenuhi
 * (qtyReceived >= qtyOrdered — over-receipt diizinkan), selain itu
 * PARTIALLY_RECEIVED. Status tidak pernah di-set manual oleh admin.
 */
export function resolveReceiptStatus(
  items: { qtyOrdered: number; qtyReceived: number }[]
): Extract<PurchaseOrderStatus, 'PARTIALLY_RECEIVED' | 'RECEIVED'> {
  const allFulfilled = items.every(
    (item) => item.qtyReceived >= item.qtyOrdered
  );
  return allFulfilled ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
}

/** Penerimaan ini melebihi sisa pesanan item? (flag overReceived di GRN). */
export function isOverReceipt(
  qtyOrdered: number,
  qtyAlreadyReceived: number,
  qtyIncoming: number
): boolean {
  return qtyIncoming > qtyOrdered - qtyAlreadyReceived;
}
