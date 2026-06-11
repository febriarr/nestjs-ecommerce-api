import { isOverReceipt, resolveReceiptStatus } from './po-status.util';

describe('resolveReceiptStatus', () => {
  it('RECEIVED bila semua item terpenuhi', () => {
    expect(
      resolveReceiptStatus([
        { qtyOrdered: 10, qtyReceived: 10 },
        { qtyOrdered: 5, qtyReceived: 5 },
      ])
    ).toBe('RECEIVED');
  });

  it('RECEIVED bila over-receipt (qtyReceived melebihi pesanan)', () => {
    expect(resolveReceiptStatus([{ qtyOrdered: 10, qtyReceived: 12 }])).toBe(
      'RECEIVED'
    );
  });

  it('PARTIALLY_RECEIVED bila ada item yang belum penuh', () => {
    expect(
      resolveReceiptStatus([
        { qtyOrdered: 10, qtyReceived: 10 },
        { qtyOrdered: 5, qtyReceived: 3 },
      ])
    ).toBe('PARTIALLY_RECEIVED');
  });
});

describe('isOverReceipt', () => {
  it('false bila qty masuk pas dengan sisa', () => {
    expect(isOverReceipt(10, 4, 6)).toBe(false);
  });

  it('true bila qty masuk melebihi sisa', () => {
    expect(isOverReceipt(10, 4, 7)).toBe(true);
  });

  it('true bila item sudah penuh lalu datang lagi', () => {
    expect(isOverReceipt(10, 10, 1)).toBe(true);
  });
});
