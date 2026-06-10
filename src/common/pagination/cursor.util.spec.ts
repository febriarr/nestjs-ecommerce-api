import { buildCursorPage, decodeCursor, encodeCursor } from './cursor.util';

describe('cursor util', () => {
  it('encode lalu decode menghasilkan id semula', () => {
    const cursor = encodeCursor(42);
    expect(typeof cursor).toBe('string');
    expect(decodeCursor(cursor)).toBe(42);
  });

  it('decode mengembalikan null untuk kosong/invalid', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('!!!not-base64!!!')).toBeNull();
  });

  describe('buildCursorPage', () => {
    const rows = [{ id: 3 }, { id: 2 }, { id: 1 }];

    it('memotong ke limit dan menandai hasNextPage + nextCursor', () => {
      const { items, meta } = buildCursorPage(rows, 2, (r) => r.id);
      expect(items).toHaveLength(2);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.limit).toBe(2);
      expect(meta.nextCursor).toBe(encodeCursor(2));
    });

    it('tanpa halaman berikutnya bila baris <= limit', () => {
      const { items, meta } = buildCursorPage(rows.slice(0, 2), 2, (r) => r.id);
      expect(items).toHaveLength(2);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.nextCursor).toBeNull();
    });
  });
});
