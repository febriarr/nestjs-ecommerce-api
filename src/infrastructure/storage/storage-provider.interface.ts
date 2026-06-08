import { Readable } from 'node:stream';

/**
 * Abstraction provider-agnostic untuk object storage.
 *
 * Implementasi (Cloudflare R2, AWS S3, MinIO, GCS, dll.) cukup memenuhi kontrak
 * ini, sehingga business logic tidak perlu berubah ketika provider diganti.
 */
export interface StorageProvider {
  /**
   * Unggah objek ke storage.
   *
   * @param file Konten file dalam bentuk Buffer.
   * @param key Path/identifier objek di dalam bucket (mis. `invoices/INV-1.pdf`).
   * @param contentType MIME type objek (mis. `application/pdf`).
   * @returns Key objek yang tersimpan (referensi kanonik untuk disimpan ke DB).
   */
  upload(file: Buffer, key: string, contentType: string): Promise<string>;

  /**
   * Ambil objek sebagai stream untuk dibaca/di-pipe ke response.
   *
   * @param key Key objek.
   * @returns Stream `Readable` dari konten objek.
   */
  getObject(key: string): Promise<Readable>;

  /**
   * Hapus objek dari storage.
   *
   * @param key Key objek.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Cek keberadaan objek tanpa mengunduh kontennya.
   *
   * @param key Key objek.
   * @returns `true` jika objek ada, selain itu `false`.
   */
  exists(key: string): Promise<boolean>;
}
