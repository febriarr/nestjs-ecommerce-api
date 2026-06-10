import { ProductDiscountsService } from './product-discounts.service';
import { ProductDiscountsRepository } from './product-discounts.repository';
import { ProductsRepository } from './products.repository';
import { AppException } from '../../common/exceptions/app-exceptions';
import { SelectProductDiscount } from '../../infrastructure/database/schema';
import { CreateDiscountDTO } from './dto/create-discount.dto';

const discount: SelectProductDiscount = {
  id: 1,
  productId: 1,
  type: 'PERCENTAGE',
  percentage: 20,
  fixedAmount: null,
  maxDiscount: null,
  priority: 0,
  startAt: new Date('2026-01-01T00:00:00Z'),
  endAt: new Date('2026-02-01T00:00:00Z'),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const validDto: CreateDiscountDTO = {
  type: 'PERCENTAGE',
  percentage: 20,
  startAt: '2026-01-01T00:00:00Z',
  endAt: '2026-02-01T00:00:00Z',
};

describe('ProductDiscountsService.create', () => {
  let repo: jest.Mocked<ProductDiscountsRepository>;
  let productsRepo: jest.Mocked<ProductsRepository>;
  let service: ProductDiscountsService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      listByProduct: jest.fn(),
      findActive: jest.fn(),
      insert: jest.fn().mockResolvedValue(discount),
      update: jest.fn().mockResolvedValue(discount),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ProductDiscountsRepository>;
    productsRepo = {
      findById: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as jest.Mocked<ProductsRepository>;
    service = new ProductDiscountsService(repo, productsRepo);
  });

  it('membuat diskon PERCENTAGE yang valid', async () => {
    const result = await service.create(1, validDto);
    expect(repo.insert).toHaveBeenCalledTimes(1);
    expect(result.type).toBe('PERCENTAGE');
  });

  it('menolak bila produk tidak ada', async () => {
    productsRepo.findById.mockResolvedValue(null);
    await expect(service.create(1, validDto)).rejects.toBeInstanceOf(
      AppException
    );
  });

  it('menolak PERCENTAGE tanpa percentage', async () => {
    await expect(
      service.create(1, { ...validDto, percentage: undefined })
    ).rejects.toBeInstanceOf(AppException);
  });

  it('menolak FIXED tanpa fixedAmount', async () => {
    await expect(
      service.create(1, {
        type: 'FIXED',
        startAt: validDto.startAt,
        endAt: validDto.endAt,
      })
    ).rejects.toBeInstanceOf(AppException);
  });

  it('menolak endAt <= startAt', async () => {
    await expect(
      service.create(1, {
        ...validDto,
        startAt: '2026-02-01T00:00:00Z',
        endAt: '2026-01-01T00:00:00Z',
      })
    ).rejects.toBeInstanceOf(AppException);
  });
});
