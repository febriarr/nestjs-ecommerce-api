import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp, { Metadata } from 'sharp';
import { ImageInvalidException } from '../../common/exceptions/domains/image.exceptions';

const DEFAULT_WEBP_QUALITY = 80;
/** Effort 0-6: lebih tinggi = kompresi lebih optimal (file lebih kecil). */
const WEBP_EFFORT = 6;

/**
 * Service pemrosesan gambar berbasis Sharp.
 *
 * Catatan: TIDAK melakukan resize, crop, atau rotate — dimensi & aspect ratio
 * asli dipertahankan, hanya mengonversi ke WebP dan mengoptimalkan ukuran file.
 */
@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);
  private readonly webpQuality: number;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('IMAGE_WEBP_QUALITY');
    const parsed = raw === undefined ? DEFAULT_WEBP_QUALITY : Number(raw);
    this.webpQuality =
      Number.isFinite(parsed) && parsed > 0 && parsed <= 100
        ? parsed
        : DEFAULT_WEBP_QUALITY;
  }

  /**
   * Konversi buffer gambar ke WebP tanpa mengubah dimensi/aspect ratio.
   *
   * @param buffer Buffer gambar sumber.
   * @returns Buffer gambar dalam format WebP.
   */
  async convertToWebp(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .webp({ quality: this.webpQuality, effort: WEBP_EFFORT })
        .toBuffer();
    } catch (error) {
      this.logger.error('Gagal mengonversi gambar ke WebP', error);
      throw ImageInvalidException({ cause: error });
    }
  }

  /**
   * Validasi bahwa buffer merupakan gambar yang valid & dikenali.
   *
   * @param buffer Buffer gambar sumber.
   * @returns Metadata gambar (dipakai ulang oleh pemanggil).
   */
  async validate(buffer: Buffer): Promise<Metadata> {
    const metadata = await this.getMetadata(buffer);
    if (
      metadata.format === undefined ||
      metadata.width === undefined ||
      metadata.height === undefined
    ) {
      throw ImageInvalidException();
    }
    return metadata;
  }

  /**
   * Baca metadata gambar (format, width, height, dll.).
   *
   * @param buffer Buffer gambar sumber.
   */
  async getMetadata(buffer: Buffer): Promise<Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      throw ImageInvalidException({ cause: error });
    }
  }
}
