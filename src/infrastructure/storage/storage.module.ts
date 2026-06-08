import { Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage.constants';
import { R2StorageProvider } from './r2-storage.provider';

/**
 * Module storage provider-agnostic.
 *
 * Untuk mengganti provider, cukup ubah `useClass` ke implementasi lain
 * yang memenuhi `StorageProvider` (mis. S3StorageProvider, MinioStorageProvider).
 * Consumer tidak perlu diubah karena mereka bergantung pada token STORAGE_PROVIDER.
 */
@Module({
  providers: [{ provide: STORAGE_PROVIDER, useClass: R2StorageProvider }],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
