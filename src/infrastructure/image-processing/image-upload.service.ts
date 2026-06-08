import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { uuidv7 } from 'uuidv7';
import { STORAGE_PROVIDER } from '../storage/storage.constants';
import type { StorageProvider } from '../storage/storage-provider.interface';
import { ImageProcessingService } from './image-processing.service';
import { UploadedFileMetadata } from './image.types';
import { ImageInvalidException } from '../../common/exceptions/domains/image.exceptions';

const WEBP_CONTENT_TYPE = 'image/webp';
const WEBP_FORMAT = 'webp';

/**
 * Orkestrasi flow upload image:
 *   1. Validasi gambar.
 *   2. Konversi ke WebP.
 *   3. Upload ke StorageProvider.
 *   4. Kembalikan metadata file.
 *
 * Reusable lintas domain (mis. logo brand, gambar kategori, dll.).
 */
@Injectable()
export class ImageUploadService {
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly imageProcessing: ImageProcessingService,
    private readonly config: ConfigService
  ) {
    this.publicBaseUrl = this.config
      .getOrThrow<string>('R2_PUBLIC_URL')
      .replace(/\/+$/, '');
  }

  /**
   * Upload satu gambar: validasi → konversi WebP → simpan → metadata.
   *
   * @param buffer Buffer gambar sumber.
   * @param prefix Prefix/folder key di storage (mis. `brands`, `categories`).
   * @returns Metadata file hasil upload.
   */
  async uploadImage(
    buffer: Buffer,
    prefix: string
  ): Promise<UploadedFileMetadata> {
    // 1. Validasi gambar.
    await this.imageProcessing.validate(buffer);

    // 2. Konversi ke WebP.
    const webp = await this.imageProcessing.convertToWebp(buffer);
    const metadata = await this.imageProcessing.getMetadata(webp);
    if (metadata.width === undefined || metadata.height === undefined) {
      throw ImageInvalidException();
    }

    // 3. Upload ke StorageProvider.
    const key = this.buildKey(prefix);
    await this.storage.upload(webp, key, WEBP_CONTENT_TYPE);

    // 4. Kembalikan metadata file.
    return {
      key,
      url: `${this.publicBaseUrl}/${key}`,
      contentType: WEBP_CONTENT_TYPE,
      size: webp.length,
      width: metadata.width,
      height: metadata.height,
      format: WEBP_FORMAT,
    };
  }

  private buildKey(prefix: string): string {
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    return `${normalizedPrefix}/${uuidv7()}.${WEBP_FORMAT}`;
  }
}
