import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { StorageProvider } from './storage-provider.interface';
import { StorageObjectStreamException } from '../../common/exceptions/domains/storage.exceptions';

/**
 * Implementasi StorageProvider untuk Cloudflare R2 melalui AWS SDK v3
 * (R2 kompatibel dengan S3 API).
 *
 * Mengganti provider (S3/MinIO/GCS) cukup dengan membuat class lain yang
 * `implements StorageProvider` dan menukar `useClass` di StorageModule.
 */
@Injectable()
export class R2StorageProvider
  implements StorageProvider, OnApplicationShutdown
{
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET');
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.getOrThrow<string>('R2_ENDPOINT_URL'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(
    file: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    return key;
  }

  async getObject(key: string): Promise<Readable> {
    const output = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );

    const body = output.Body;
    if (!(body instanceof Readable)) {
      throw StorageObjectStreamException({
        details: { key },
      });
    }

    return body;
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      );
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.client.destroy();
    this.logger.log('R2 storage client destroyed');
    return Promise.resolve();
  }

  private isNotFoundError(error: unknown): boolean {
    if (error instanceof S3ServiceException) {
      return (
        error.name === 'NotFound' || error.$metadata.httpStatusCode === 404
      );
    }
    return false;
  }
}
