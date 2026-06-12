import { Injectable, Logger } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { CreateProductDTO } from './dto/create-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductQueryDTO } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/response-product.dto';
import { CreateProductAttributeDTO } from './dto/create-product-attribute.dto';
import { ProductAttributeResponseDto } from './dto/response-product-attribute.dto';
import { AddProductMediaDTO } from './dto/add-product-media.dto';
import { ReorderMediaDTO } from './dto/reorder-media.dto';
import { ProductMediaResponseDto } from './dto/response-product-media.dto';
import {
  InsertProduct,
  SelectProduct,
  SelectProductMedia,
} from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildCursorPage,
  decodeCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import {
  AttributeNotFoundException,
  CategoryNotFoundException,
  ProductNotFoundException,
  ProductSlugConflictException,
} from '../../common/exceptions/domains/product.exceptions';
import {
  MediaNotOwnedByProductException,
  ProductMediaNotFoundException,
} from '../../common/exceptions/domains/product-media.exceptions';
import { BrandNotFoundException } from '../../common/exceptions/domains/brand.exceptions';

const PRODUCT_MEDIA_PREFIX = 'products';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly repo: ProductsRepository,
    private readonly imageUpload: ImageUploadService
  ) {}

  // ---------- products ----------

  async create(
    dto: CreateProductDTO,
    createdBy: string,
    thumbnail?: Express.Multer.File
  ): Promise<ProductResponseDto> {
    await this.assertCategory(dto.categoryId);
    if (dto.brandId !== undefined) await this.assertBrand(dto.brandId);
    await this.assertSlugAvailable(dto.slug);

    const payload: InsertProduct = {
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      shortDescription: dto.shortDescription ?? null,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      createdBy,
      ...(dto.status ? { status: dto.status } : {}),
    };

    const product = await this.repo.insert(payload);
    if (!thumbnail) return this.toProductResponse(product);

    // Thumbnail opsional di step 1: upload → product_media → set thumbnailMediaId.
    const meta = await this.imageUpload.uploadImage(
      thumbnail.buffer,
      `${PRODUCT_MEDIA_PREFIX}/${product.id}`
    );
    try {
      const media = await this.repo.insertMedia({
        productId: product.id,
        imageUrl: meta.key,
      });
      const updated = await this.repo.update(product.id, {
        thumbnailMediaId: media.id,
      });
      return this.toProductResponse(updated);
    } catch (error) {
      await this.safeDeleteImage(meta.key);
      throw error;
    }
  }

  async list(
    query: ProductQueryDTO
  ): Promise<WithMetadata<ProductResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const cursorId = decodeCursor(query.cursor);

    const rows = await this.repo.list(
      {
        status: query.status,
        categoryId: query.categoryId,
        brandId: query.brandId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        search: query.search,
      },
      cursorId,
      limit
    );

    const { items, meta } = buildCursorPage(rows, limit, (p) => p.id);
    const data = await this.toProductResponseList(items);
    return { data, metadata: meta };
  }

  async findById(id: number): Promise<ProductResponseDto> {
    const product = await this.getProductOrThrow(id);
    return this.toProductResponse(product);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw ProductNotFoundException({ details: { slug } });
    return this.toProductResponse(product);
  }

  async update(id: number, dto: UpdateProductDTO): Promise<ProductResponseDto> {
    const existing = await this.getProductOrThrow(id);
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    if (dto.brandId !== undefined && dto.brandId !== null)
      await this.assertBrand(dto.brandId);
    if (dto.slug && dto.slug !== existing.slug)
      await this.assertSlugAvailable(dto.slug);

    const product = await this.repo.update(id, {
      ...dto,
      brandId: dto.brandId ?? existing.brandId,
    });
    return this.toProductResponse(product);
  }

  async softDelete(id: number): Promise<void> {
    await this.getProductOrThrow(id);
    await this.repo.softDelete(id);
  }

  // ---------- product attributes ----------

  async addAttribute(
    productId: number,
    dto: CreateProductAttributeDTO
  ): Promise<ProductAttributeResponseDto> {
    await this.getProductOrThrow(productId);
    if (!(await this.repo.attributeExists(dto.attributeId)))
      throw AttributeNotFoundException({ details: { id: dto.attributeId } });

    const existing = await this.repo.findAttribute(productId, dto.attributeId);
    if (existing) return new ProductAttributeResponseDto(existing);

    const row = await this.repo.insertAttribute({
      productId,
      attributeId: dto.attributeId,
      ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
    return new ProductAttributeResponseDto(row);
  }

  async listAttributes(
    productId: number
  ): Promise<ProductAttributeResponseDto[]> {
    await this.getProductOrThrow(productId);
    const rows = await this.repo.listAttributes(productId);
    return rows.map((r) => new ProductAttributeResponseDto(r));
  }

  async removeAttribute(productId: number, attributeId: number): Promise<void> {
    await this.getProductOrThrow(productId);
    await this.repo.deleteAttribute(productId, attributeId);
  }

  // ---------- product media ----------

  async addMedia(
    productId: number,
    buffer: Buffer,
    dto: AddProductMediaDTO
  ): Promise<ProductMediaResponseDto> {
    await this.getProductOrThrow(productId);
    const metadata = await this.imageUpload.uploadImage(
      buffer,
      `${PRODUCT_MEDIA_PREFIX}/${productId}`
    );
    try {
      const row = await this.repo.insertMedia({
        productId,
        imageUrl: metadata.key,
        imageAlt: dto.imageAlt ?? null,
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      });
      return this.toMediaResponse(row);
    } catch (error) {
      await this.safeDeleteImage(metadata.key);
      throw error;
    }
  }

  async listMedia(productId: number): Promise<ProductMediaResponseDto[]> {
    await this.getProductOrThrow(productId);
    const rows = await this.repo.listMedia(productId);
    return rows.map((r) => this.toMediaResponse(r));
  }

  async removeMedia(productId: number, mediaId: number): Promise<void> {
    await this.getProductOrThrow(productId);
    const media = await this.getMediaOwned(productId, mediaId);
    await this.repo.deleteMedia(mediaId);
    await this.safeDeleteImage(media.imageUrl);
  }

  async reorderMedia(productId: number, dto: ReorderMediaDTO): Promise<void> {
    await this.getProductOrThrow(productId);
    for (const item of dto.items) {
      await this.getMediaOwned(productId, item.mediaId);
    }
    for (const item of dto.items) {
      await this.repo.updateMediaSort(item.mediaId, item.sortOrder);
    }
  }

  async setThumbnail(
    productId: number,
    mediaId: number
  ): Promise<ProductResponseDto> {
    await this.getProductOrThrow(productId);
    await this.getMediaOwned(productId, mediaId);
    const product = await this.repo.update(productId, {
      thumbnailMediaId: mediaId,
    });
    return this.toProductResponse(product);
  }

  // ---------- helpers ----------

  private async getProductOrThrow(id: number): Promise<SelectProduct> {
    const product = await this.repo.findById(id);
    if (!product) throw ProductNotFoundException({ details: { id } });
    return product;
  }

  private async getMediaOwned(
    productId: number,
    mediaId: number
  ): Promise<SelectProductMedia> {
    const media = await this.repo.findMediaById(mediaId);
    if (!media) throw ProductMediaNotFoundException({ details: { mediaId } });
    if (media.productId !== productId)
      throw MediaNotOwnedByProductException({
        details: { productId, mediaId },
      });
    return media;
  }

  private async assertCategory(categoryId: string): Promise<void> {
    if (!(await this.repo.categoryExists(categoryId)))
      throw CategoryNotFoundException({ details: { categoryId } });
  }

  private async assertBrand(brandId: number): Promise<void> {
    if (!(await this.repo.brandExists(brandId)))
      throw BrandNotFoundException({ details: { brandId } });
  }

  private async assertSlugAvailable(slug: string): Promise<void> {
    if (await this.repo.findBySlug(slug))
      throw ProductSlugConflictException({ details: { slug } });
  }

  private toMediaResponse(row: SelectProductMedia): ProductMediaResponseDto {
    return new ProductMediaResponseDto({
      ...row,
      imageUrl: this.imageUpload.resolveUrl(row.imageUrl),
    });
  }

  private async toProductResponse(
    product: SelectProduct
  ): Promise<ProductResponseDto> {
    const [dto] = await this.toProductResponseList([product]);
    return dto;
  }

  private async toProductResponseList(
    items: SelectProduct[]
  ): Promise<ProductResponseDto[]> {
    const thumbIds = items
      .map((p) => p.thumbnailMediaId)
      .filter((id): id is number => id !== null);
    const keyMap = new Map<number, string>();
    if (thumbIds.length > 0) {
      const rows = await this.repo.mediaKeysByIds(thumbIds);
      for (const r of rows) keyMap.set(r.id, r.imageKey);
    }
    return items.map(
      (p) =>
        new ProductResponseDto({
          ...p,
          thumbnailUrl:
            p.thumbnailMediaId !== null
              ? this.imageUpload.resolveUrl(
                  keyMap.get(p.thumbnailMediaId) ?? null
                )
              : null,
        })
    );
  }

  private async safeDeleteImage(key: string): Promise<void> {
    try {
      await this.imageUpload.deleteImage(key);
    } catch (error) {
      this.logger.warn(`Gagal menghapus objek storage: ${key}`, error);
    }
  }
}
