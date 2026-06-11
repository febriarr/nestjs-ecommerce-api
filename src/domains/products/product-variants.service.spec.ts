import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsRepository } from './product-variants.repository';
import { ProductsRepository } from './products.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { AppException } from '../../common/exceptions/app-exceptions';
import {
  SelectAttributeValuse,
  SelectProduct,
  SelectProductVariant,
} from '../../infrastructure/database/schema';
import { CreateVariantDTO } from './dto/create-variant.dto';

const product: SelectProduct = {
  id: 1,
  name: 'Air Max',
  slug: 'air-max',
  description: null,
  shortDescription: null,
  categoryId: 'cat-uuid',
  brandId: 5,
  status: 'active',
  thumbnailMediaId: null,
  minPrice: null,
  createdBy: 'user-uuid',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const variant: SelectProductVariant = {
  id: 100,
  productId: 1,
  skuNumber: 1000000001,
  skuCode: 'NIK-AIR-MAX-RED-42',
  variantName: null,
  price: 100000,
  compareAtPrice: null,
  weight: null,
  isDefault: false,
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function attrValue(
  id: number,
  attributeId: number,
  value: string
): SelectAttributeValuse {
  return {
    id,
    attributeId,
    value,
    displayValue: null,
    colorHex: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function makeVariantsRepo(): jest.Mocked<ProductVariantsRepository> {
  return {
    findById: jest.fn(),
    listByProduct: jest.fn(),
    skuCodeExists: jest.fn().mockResolvedValue(false),
    totalAvailableStock: jest.fn().mockResolvedValue(0),
    createVariant: jest.fn().mockResolvedValue(variant),
    update: jest.fn().mockResolvedValue(variant),
    softDelete: jest.fn(),
    listAttributes: jest.fn().mockResolvedValue([]),
    findVariantMedia: jest.fn(),
    insertVariantMedia: jest.fn(),
    deleteVariantMedia: jest.fn(),
    listVariantMedia: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<ProductVariantsRepository>;
}

function makeProductsRepo(): jest.Mocked<ProductsRepository> {
  return {
    findById: jest.fn().mockResolvedValue(product),
    attributeValuesByIds: jest.fn(),
    brandNameById: jest.fn().mockResolvedValue('Nike'),
    recomputeMinPrice: jest.fn(),
    findMediaById: jest.fn(),
  } as unknown as jest.Mocked<ProductsRepository>;
}

const dto: CreateVariantDTO = {
  price: 100000,
  attributeValueIds: [10, 20],
};

describe('ProductVariantsService.create', () => {
  let variantsRepo: jest.Mocked<ProductVariantsRepository>;
  let productsRepo: jest.Mocked<ProductsRepository>;
  let service: ProductVariantsService;

  beforeEach(() => {
    variantsRepo = makeVariantsRepo();
    productsRepo = makeProductsRepo();
    service = new ProductVariantsService(variantsRepo, productsRepo, {
      resolveUrl: jest.fn().mockReturnValue(null),
    } as unknown as ImageUploadService);
  });

  it('membuat variant, generate sku, dan recompute minPrice', async () => {
    productsRepo.attributeValuesByIds.mockResolvedValue([
      attrValue(10, 1, 'Red'),
      attrValue(20, 2, '42'),
    ]);

    await service.create(1, dto);

    expect(variantsRepo.createVariant).toHaveBeenCalledTimes(1);
    const [payload, pairs] = variantsRepo.createVariant.mock.calls[0];
    expect(payload.skuCode).toBe('NIK-AIR-MAX-RED-42');
    expect(pairs).toEqual([
      { attributeId: 1, attributeValueId: 10 },
      { attributeId: 2, attributeValueId: 20 },
    ]);
    expect(productsRepo.recomputeMinPrice).toHaveBeenCalledWith(1);
  });

  it('menolak bila product tidak ditemukan', async () => {
    productsRepo.findById.mockResolvedValue(null);
    await expect(service.create(1, dto)).rejects.toBeInstanceOf(AppException);
  });

  it('menolak bila ada attribute value yang tidak ditemukan', async () => {
    productsRepo.attributeValuesByIds.mockResolvedValue([
      attrValue(10, 1, 'Red'),
    ]);
    await expect(service.create(1, dto)).rejects.toBeInstanceOf(AppException);
  });

  it('menolak dua value dari attribute yang sama (duplikat)', async () => {
    productsRepo.attributeValuesByIds.mockResolvedValue([
      attrValue(10, 1, 'Red'),
      attrValue(20, 1, 'Blue'),
    ]);
    await expect(service.create(1, dto)).rejects.toBeInstanceOf(AppException);
  });

  it('menolak skuCode manual yang sudah dipakai', async () => {
    variantsRepo.skuCodeExists.mockResolvedValue(true);
    productsRepo.attributeValuesByIds.mockResolvedValue([
      attrValue(10, 1, 'Red'),
      attrValue(20, 2, '42'),
    ]);
    await expect(
      service.create(1, { ...dto, skuCode: 'MANUAL-1' })
    ).rejects.toBeInstanceOf(AppException);
  });
});
