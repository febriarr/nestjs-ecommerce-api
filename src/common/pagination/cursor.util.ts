import { CursorPaginationMeta } from '../types/api-response.type';

/** Encode id numerik menjadi cursor opaque (base64url). */
export function encodeCursor(id: number): string {
  return Buffer.from(String(id), 'utf8').toString('base64url');
}

/** Decode cursor menjadi id numerik; null bila kosong/invalid. */
export function decodeCursor(cursor?: string): number | null {
  if (!cursor) {
    return null;
  }
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const id = Number(decoded);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Bentuk hasil paginasi keyset (tanpa count) dari deretan baris yang diambil
 * sebanyak `limit + 1`. Mengembalikan item terpotong + metadata cursor.
 *
 * @param rows Baris hasil query (sudah diambil limit + 1).
 * @param limit Jumlah item per halaman.
 * @param getId Pengambil id dari sebuah item (untuk membentuk nextCursor).
 */
export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  getId: (row: T) => number
): { items: T[]; meta: CursorPaginationMeta } {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    meta: {
      limit,
      hasNextPage,
      nextCursor: hasNextPage && last ? encodeCursor(getId(last)) : null,
    },
  };
}
