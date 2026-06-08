/**
 * Metadata file yang dikembalikan setelah proses upload image selesai.
 */
export interface UploadedFileMetadata {
  /** Key/path objek di storage (referensi kanonik untuk disimpan ke DB). */
  key: string;
  /** URL publik objek (dibentuk dari R2_PUBLIC_URL). */
  url: string;
  /** MIME type hasil akhir (selalu `image/webp`). */
  contentType: string;
  /** Ukuran file hasil dalam byte. */
  size: number;
  /** Lebar gambar dalam piksel (dimensi asli dipertahankan). */
  width: number;
  /** Tinggi gambar dalam piksel (dimensi asli dipertahankan). */
  height: number;
  /** Format hasil (selalu `webp`). */
  format: string;
}

/**
 * MIME type gambar input yang diterima sebelum dikonversi ke WebP.
 */
export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/gif',
];
