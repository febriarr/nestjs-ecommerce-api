import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectProduct } from '../../infrastructure/database/schema';
import { CreateProductDTO } from './dto/create-product.dto';

const product: SelectProduct = {
  id: 1,
  name: 'Air Max',
  slug: 'air-max',
  description: null,
  shortDescription: null,
  categoryId: 'cat-uuid',
  brandId: 5,
  status: 'draft',
  thumbnailMediaId: null,
  minPrice: null,
  createdBy: 'user-uuid',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const createDto: CreateProductDTO = {
  name: 'Air Max',
  slug: 'air-max',
  categoryId: 'cat-uuid',
  brandId: 5,
  createdBy: 'user-uuid',
};

function makeRepo(): jest.Mocked<ProductsRepository> {
  return {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    list: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    categoryExists: jest.fn(),
    brandExists: jest.fn(),
    mediaKeysByIds: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<ProductsRepository>;
}

function makeImageUpload(): jest.Mocked<ImageUploadService> {
  return {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
    resolveUrl: jest.fn().mockReturnValue(null),
  } as unknown as jest.Mocked<ImageUploadService>;
}

describe('ProductsService', () => {
  let repo: jest.Mocked<ProductsRepository>;
  let imageUpload: jest.Mocked<ImageUploadService>;
  let service: ProductsService;

  beforeEach(() => {
    repo = makeRepo();
    imageUpload = makeImageUpload();
    service = new ProductsService(repo, imageUpload);
  });

  describe('create', () => {
    it('membuat produk ketika category valid & slug tersedia', async () => {
      repo.categoryExists.mockResolvedValue(true);
      repo.brandExists.mockResolvedValue(true);
      repo.findBySlug.mockResolvedValue(null);
      repo.insert.mockResolvedValue(product);

      const result = await service.create(createDto);

      expect(repo.insert).toHaveBeenCalledTimes(1);
      expect(result.slug).toBe('air-max');
    });

    it('menolak bila category tidak ada', async () => {
      repo.categoryExists.mockResolvedValue(false);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        AppException
      );
      expect(repo.insert).not.toHaveBeenCalled();
    });

    it('menolak bila slug sudah dipakai (konflik)', async () => {
      repo.categoryExists.mockResolvedValue(true);
      repo.brandExists.mockResolvedValue(true);
      repo.findBySlug.mockResolvedValue(product);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        AppException
      );
    });
  });

  describe('list', () => {
    it('mengembalikan data + metadata cursor', async () => {
      repo.list.mockResolvedValue([product, { ...product, id: 2 }]);
      const result = await service.list({ limit: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.metadata).toEqual(
        expect.objectContaining({ limit: 1, hasNextPage: true })
      );
    });
  });

  describe('findById', () => {
    it('melempar AppException bila tidak ditemukan', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById(99)).rejects.toBeInstanceOf(AppException);
    });
  });
});
