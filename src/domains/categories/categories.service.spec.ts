import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectCategories } from '../../infrastructure/database/schema';

function category(
  id: string,
  parentId: string | null,
  name: string
): SelectCategories {
  return {
    id,
    parentId,
    name,
    slug: name.toLowerCase(),
    description: null,
    imageUrl: null,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('CategoriesService', () => {
  let repo: jest.Mocked<CategoriesRepository>;
  let service: CategoriesService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<CategoriesRepository>;
    service = new CategoriesService(repo, {
      uploadImage: jest.fn(),
      deleteImage: jest.fn(),
      resolveUrl: jest.fn().mockReturnValue(null),
    } as unknown as ImageUploadService);
  });

  describe('create', () => {
    it('membuat kategori ketika slug tersedia', async () => {
      repo.findBySlug.mockResolvedValue(null);
      repo.insert.mockResolvedValue(category('a', null, 'Shoes'));
      const result = await service.create({ name: 'Shoes', slug: 'shoes' });
      expect(result.slug).toBe('shoes');
      expect(repo.insert).toHaveBeenCalled();
    });

    it('menolak slug yang sudah dipakai', async () => {
      repo.findBySlug.mockResolvedValue(category('a', null, 'Shoes'));
      await expect(
        service.create({ name: 'Shoes', slug: 'shoes' })
      ).rejects.toBeInstanceOf(AppException);
    });

    it('menolak parentId yang tidak ada', async () => {
      repo.findBySlug.mockResolvedValue(null);
      repo.findById.mockResolvedValue(null);
      await expect(
        service.create({ name: 'Shoes', slug: 'shoes', parentId: 'missing' })
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('tree', () => {
    it('membangun struktur parent -> children', async () => {
      repo.findAll.mockResolvedValue([
        category('a', null, 'Root'),
        category('b', 'a', 'Child'),
      ]);
      const tree = await service.tree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('a');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('b');
    });
  });

  it('findById melempar bila tidak ada', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toBeInstanceOf(AppException);
  });
});
