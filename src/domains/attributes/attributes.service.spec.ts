import { AttributesService } from './attributes.service';
import { AttributesRepository } from './attributes.repository';
import { AppException } from '../../common/exceptions/app-exceptions';
import {
  SelectAttribute,
  SelectAttributeValuse,
} from '../../infrastructure/database/schema';

const attribute: SelectAttribute = {
  id: 1,
  name: 'color',
  displayName: 'Color',
  type: 'color',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const value: SelectAttributeValuse = {
  id: 10,
  attributeId: 1,
  value: 'red',
  displayValue: 'Red',
  colorHex: '#FF0000',
  sortOrder: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AttributesService', () => {
  let repo: jest.Mocked<AttributesRepository>;
  let service: AttributesService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findValueById: jest.fn(),
      findValueByValue: jest.fn(),
      listValues: jest.fn(),
      insertValue: jest.fn(),
      updateValue: jest.fn(),
      softDeleteValue: jest.fn(),
    } as unknown as jest.Mocked<AttributesRepository>;
    service = new AttributesService(repo);
  });

  describe('create', () => {
    it('membuat attribute dengan nama unik', async () => {
      repo.findByName.mockResolvedValue(null);
      repo.insert.mockResolvedValue(attribute);
      const result = await service.create({
        name: 'color',
        displayName: 'Color',
        type: 'color',
      });
      expect(result.name).toBe('color');
    });

    it('menolak nama yang sudah dipakai', async () => {
      repo.findByName.mockResolvedValue(attribute);
      await expect(
        service.create({ name: 'color', displayName: 'Color', type: 'color' })
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('addValue', () => {
    it('menambah value bila attribute ada & value belum dipakai', async () => {
      repo.findById.mockResolvedValue(attribute);
      repo.findValueByValue.mockResolvedValue(null);
      repo.insertValue.mockResolvedValue(value);
      const result = await service.addValue(1, { value: 'red' });
      expect(result.value).toBe('red');
    });

    it('menolak bila attribute tidak ada', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.addValue(1, { value: 'red' })
      ).rejects.toBeInstanceOf(AppException);
    });

    it('menolak value duplikat pada attribute yang sama', async () => {
      repo.findById.mockResolvedValue(attribute);
      repo.findValueByValue.mockResolvedValue(value);
      await expect(
        service.addValue(1, { value: 'red' })
      ).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('removeValue', () => {
    it('menolak bila value bukan milik attribute', async () => {
      repo.findValueById.mockResolvedValue({ ...value, attributeId: 999 });
      await expect(service.removeValue(1, 10)).rejects.toBeInstanceOf(
        AppException
      );
    });
  });
});
