import { Test, TestingModule } from '@nestjs/testing';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './brands.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';

describe('BrandsService', () => {
  let service: BrandsService;

  const brandsRepository: Partial<BrandsRepository> = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const imageUpload: Partial<ImageUploadService> = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    resolveUrl: jest.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: BrandsRepository, useValue: brandsRepository },
        { provide: ImageUploadService, useValue: imageUpload },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
