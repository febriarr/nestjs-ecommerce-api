import { Readable } from 'node:stream';
import { ConfigService } from '@nestjs/config';
import { R2StorageProvider } from './r2-storage.provider';
import { AppException } from '../../common/exceptions/app-exceptions';

const mockSend = jest.fn();
const mockDestroy = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  class S3ServiceException extends Error {
    $metadata: { httpStatusCode?: number } = {};
    constructor(opts?: {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    }) {
      super(opts?.name);
      if (opts?.name) this.name = opts.name;
      if (opts?.$metadata) this.$metadata = opts.$metadata;
    }
  }
  return {
    S3Client: jest.fn(() => ({ send: mockSend, destroy: mockDestroy })),
    PutObjectCommand: jest.fn((input: unknown) => ({ input })),
    GetObjectCommand: jest.fn((input: unknown) => ({ input })),
    HeadObjectCommand: jest.fn((input: unknown) => ({ input })),
    DeleteObjectCommand: jest.fn((input: unknown) => ({ input })),
    S3ServiceException,
  };
});

const { S3ServiceException } = jest.requireMock('@aws-sdk/client-s3');

const config = {
  getOrThrow: jest.fn().mockReturnValue('dummy'),
} as unknown as ConfigService;

describe('R2StorageProvider', () => {
  let provider: R2StorageProvider;

  beforeEach(() => {
    mockSend.mockReset();
    provider = new R2StorageProvider(config);
  });

  it('upload mengembalikan key', async () => {
    mockSend.mockResolvedValue({});
    const key = await provider.upload(
      Buffer.from('x'),
      'a/b.webp',
      'image/webp'
    );
    expect(key).toBe('a/b.webp');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('getObject mengembalikan Readable', async () => {
    mockSend.mockResolvedValue({ Body: Readable.from([Buffer.from('x')]) });
    const stream = await provider.getObject('a/b.webp');
    expect(stream).toBeInstanceOf(Readable);
  });

  it('getObject melempar bila Body bukan stream', async () => {
    mockSend.mockResolvedValue({ Body: undefined });
    await expect(provider.getObject('a/b.webp')).rejects.toBeInstanceOf(
      AppException
    );
  });

  it('exists true ketika HeadObject sukses', async () => {
    mockSend.mockResolvedValue({});
    await expect(provider.exists('a/b.webp')).resolves.toBe(true);
  });

  it('exists false ketika objek NotFound (404)', async () => {
    mockSend.mockRejectedValue(
      new S3ServiceException({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      })
    );
    await expect(provider.exists('missing')).resolves.toBe(false);
  });

  it('exists melempar ulang error non-404', async () => {
    mockSend.mockRejectedValue(
      new S3ServiceException({
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      })
    );
    await expect(provider.exists('x')).rejects.toThrow();
  });
});
