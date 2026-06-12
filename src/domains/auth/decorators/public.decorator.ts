import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic' as const;

/**
 * Tandai handler/controller agar DILEWATI AuthGuard global — untuk route
 * yang memang tanpa sesi: katalog publik, login/register, webhook eksternal
 * (yang punya verifikasi sendiri, mis. HMAC payment webhook).
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
