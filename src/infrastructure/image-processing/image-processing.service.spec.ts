import { ConfigService } from '@nestjs/config';
import { ImageProcessingService } from './image-processing.service';
import { AppException } from '../../common/exceptions/app-exceptions';

const mockToBuffer = jest.fn();
const mockMetadata = jest.fn();
const mockWebp = jest.fn(() => ({ toBuffer: mockToBuffer }));

jest.mock('sharp', () =>
  jest.fn(() => ({ webp: mockWebp, metadata: mockMetadata }))
);

const config = {
  get: jest.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(() => {
    mockToBuffer.mockReset();
    mockMetadata.mockReset();
    mockWebp.mockClear();
    service = new ImageProcessingService(config);
  });

  describe('convertToWebp', () => {
    it('mengonversi buffer ke WebP', async () => {
      const out = Buffer.from('webp-bytes');
      mockToBuffer.mockResolvedValue(out);
      const result = await service.convertToWebp(Buffer.from('src'));
      expect(result).toBe(out);
      expect(mockWebp).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 80 })
      );
    });

    it('melempar ImageInvalid bila sharp gagal', async () => {
      mockToBuffer.mockRejectedValue(new Error('corrupt'));
      await expect(
        service.convertToWebp(Buffer.from('bad'))
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('validate', () => {
    it('lolos untuk metadata gambar valid', async () => {
      mockMetadata.mockResolvedValue({
        format: 'jpeg',
        width: 100,
        height: 80,
      });
      await expect(service.validate(Buffer.from('x'))).resolves.toEqual(
        expect.objectContaining({ format: 'jpeg' })
      );
    });

    it('melempar bila format tidak dikenal', async () => {
      mockMetadata.mockResolvedValue({ width: undefined, height: undefined });
      await expect(service.validate(Buffer.from('x'))).rejects.toBeInstanceOf(
        AppException
      );
    });
  });
});
