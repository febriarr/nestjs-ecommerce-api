import { Readable } from 'node:stream';

/**
 * Kumpulkan seluruh isi sebuah Readable stream menjadi satu Buffer.
 *
 * @param readable Stream sumber (mis. hasil StorageProvider.getObject).
 * @returns Buffer berisi seluruh konten stream.
 */
export async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    );
  }
  return Buffer.concat(chunks);
}
