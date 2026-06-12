import { SelectUser } from '../../infrastructure/database/schema';
import { AuthForbiddenException } from '../../common/exceptions/domains/auth.exceptions';

/** Role yang dianggap staf internal (akses operasional penuh). */
export function isAdmin(user: SelectUser): boolean {
  return user.role === 'admin' || user.role === 'super_admin';
}

/**
 * Pastikan requester mengakses resource miliknya sendiri, kecuali admin —
 * dipakai untuk resource ber-pemilik (profil, alamat, order, payment).
 */
export function assertSelfOrAdmin(
  requester: SelectUser,
  targetUserId: string
): void {
  if (!isAdmin(requester) && requester.id !== targetUserId) {
    throw AuthForbiddenException({
      details: { targetUserId, reason: 'bukan pemilik resource' },
    });
  }
}
