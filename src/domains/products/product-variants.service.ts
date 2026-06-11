import { Injectable } from '@nestjs/common';
import {
  ProductVariantsRepository,
  VariantAttributePair,
} from './product-variants.repository';
import { ProductsRepository } from './products.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { CreateVariantDTO } from './dto/create-variant.dto';
import { UpdateVariantDTO } from './dto/update-variant.dto';
import { AddVariantMediaDTO } from './dto/add-variant-media.dto';
import { VariantResponseDto } from './dto/response-variant.dto';
import {
  InsertProductVariant,
  SelectProduct,
  SelectProductVariant,
} from '../../infrastructure/database/schema';
import { buildSkuCode } from './sku-generator';
import { ProductNotFoundException } from '../../common/exceptions/domains/product.exceptions';
import { AttributeValueNotFoundException } from '../../common/exceptions/domains/product.exceptions';
import {
  VariantAttributeInvalidException,
  VariantNotFoundException,
  VariantSkuConflictException,
} from '../../common/exceptions/domains/product-variant.exceptions';
import {
  MediaNotOwnedByProductException,
  ProductMediaNotFoundException,
} from '../../common/exceptions/domains/product-media.exceptions';

@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly variantsRepo: ProductVariantsRepository,
    private readonly productsRepo: ProductsRepository,
    private readonly imageUpload: ImageUploadService
  ) {}

  async create(
    productId: number,
    dto: CreateVariantDTO
  ): Promise<VariantResponseDto> {
    const product = await this.productsRepo.findById(productId);
    if (!product)
      throw ProductNotFoundException({ details: { id: productId } });

    const pairs = await this.resolveAttributePairs(dto.attributeValueIds);
    const mediaIds = await this.resolveMediaIds(productId, dto.mediaIds);
    const skuCode = await this.resolveSkuCode(product, dto);

    const payload: InsertProductVariant = {
      productId,
      skuCode,
      variantName: dto.variantName ?? null,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice ?? null,
      weight: dto.weight ?? null,
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    };

    // Attribute yang dipakai variant otomatis dideklarasikan ke product
    // (lihat createVariant) — admin tidak perlu langkah deklarasi terpisah.
    const variant = await this.variantsRepo.createVariant(
      payload,
      pairs,
      dto.isDefault === true,
      mediaIds
    );
    await this.productsRepo.recomputeMinPrice(productId);
    return this.toVariantResponse(variant);
  }

  /** Validasi semua mediaId milik product yang sama lalu kembalikan daftarnya. */
  private async resolveMediaIds(
    productId: number,
    mediaIds?: number[]
  ): Promise<number[]> {
    if (!mediaIds || mediaIds.length === 0) return [];
    for (const mediaId of mediaIds) {
      const media = await this.productsRepo.findMediaById(mediaId);
      if (!media) throw ProductMediaNotFoundException({ details: { mediaId } });
      if (media.productId !== productId)
        throw MediaNotOwnedByProductException({
          details: { productId, mediaId },
        });
    }
    return mediaIds;
  }

  async list(productId: number): Promise<VariantResponseDto[]> {
    await this.assertProduct(productId);
    const variants = await this.variantsRepo.listByProduct(productId);
    return Promise.all(variants.map((v) => this.toVariantResponse(v)));
  }

  async findById(
    productId: number,
    variantId: number
  ): Promise<VariantResponseDto> {
    const variant = await this.getVariantOrThrow(productId, variantId);
    return this.toVariantResponse(variant);
  }

  async update(
    productId: number,
    variantId: number,
    dto: UpdateVariantDTO
  ): Promise<VariantResponseDto> {
    await this.getVariantOrThrow(productId, variantId);

    if (dto.skuCode) {
      const owner = await this.variantsRepo.skuCodeExists(dto.skuCode);
      if (owner)
        throw VariantSkuConflictException({ details: { sku: dto.skuCode } });
    }

    const variant = await this.variantsRepo.update(
      variantId,
      {
        ...(dto.skuCode !== undefined ? { skuCode: dto.skuCode } : {}),
        ...(dto.variantName !== undefined
          ? { variantName: dto.variantName }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.compareAtPrice !== undefined
          ? { compareAtPrice: dto.compareAtPrice }
          : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      dto.isDefault === true,
      productId
    );
    await this.productsRepo.recomputeMinPrice(productId);
    return this.toVariantResponse(variant);
  }

  async softDelete(productId: number, variantId: number): Promise<void> {
    await this.getVariantOrThrow(productId, variantId);
    await this.variantsRepo.softDelete(variantId);
    await this.productsRepo.recomputeMinPrice(productId);
  }

  // ---------- variant media ----------

  async addMedia(
    productId: number,
    variantId: number,
    dto: AddVariantMediaDTO
  ): Promise<void> {
    await this.getVariantOrThrow(productId, variantId);
    const media = await this.productsRepo.findMediaById(dto.mediaId);
    if (!media)
      throw ProductMediaNotFoundException({
        details: { mediaId: dto.mediaId },
      });
    if (media.productId !== productId)
      throw MediaNotOwnedByProductException({
        details: { productId, mediaId: dto.mediaId },
      });

    await this.variantsRepo.insertVariantMedia({
      variantId,
      mediaId: dto.mediaId,
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
  }

  async removeMedia(
    productId: number,
    variantId: number,
    mediaId: number
  ): Promise<void> {
    await this.getVariantOrThrow(productId, variantId);
    await this.variantsRepo.deleteVariantMedia(variantId, mediaId);
  }

  // ---------- helpers ----------

  private async assertProduct(productId: number): Promise<void> {
    if (!(await this.productsRepo.findById(productId)))
      throw ProductNotFoundException({ details: { id: productId } });
  }

  private async getVariantOrThrow(
    productId: number,
    variantId: number
  ): Promise<SelectProductVariant> {
    const variant = await this.variantsRepo.findById(variantId);
    if (!variant || variant.productId !== productId)
      throw VariantNotFoundException({ details: { productId, variantId } });
    return variant;
  }

  /**
   * Validasi attributeValueIds & derive pasangan (attributeId, attributeValueId).
   * Attribute yang dipakai akan otomatis dideklarasikan ke product saat insert
   * (lihat createVariant), jadi tidak perlu deklarasi terpisah lebih dulu.
   * Tetap menolak dua value dari attribute yang sama (mis. Red & Black).
   */
  private async resolveAttributePairs(
    attributeValueIds: number[]
  ): Promise<VariantAttributePair[]> {
    const values =
      await this.productsRepo.attributeValuesByIds(attributeValueIds);
    if (values.length !== attributeValueIds.length)
      throw AttributeValueNotFoundException({ details: { attributeValueIds } });

    const seenAttributes = new Set<number>();
    const pairs: VariantAttributePair[] = [];

    for (const value of values) {
      if (seenAttributes.has(value.attributeId))
        throw VariantAttributeInvalidException({
          details: { attributeId: value.attributeId, reason: 'duplicate' },
        });
      seenAttributes.add(value.attributeId);
      pairs.push({
        attributeId: value.attributeId,
        attributeValueId: value.id,
      });
    }
    return pairs;
  }

  /** Tentukan skuCode: override manual (cek unik) atau auto-generate unik. */
  private async resolveSkuCode(
    product: SelectProduct,
    dto: CreateVariantDTO
  ): Promise<string> {
    if (dto.skuCode) {
      if (await this.variantsRepo.skuCodeExists(dto.skuCode))
        throw VariantSkuConflictException({ details: { sku: dto.skuCode } });
      return dto.skuCode;
    }

    const brandName =
      product.brandId !== null
        ? await this.productsRepo.brandNameById(product.brandId)
        : null;
    const values = await this.productsRepo.attributeValuesByIds(
      dto.attributeValueIds
    );
    const valueLabels = values
      .slice()
      .sort((a, b) => a.attributeId - b.attributeId)
      .map((v) => v.displayValue ?? v.value);

    const base = buildSkuCode({
      brandName,
      productSlug: product.slug,
      valueLabels,
    });

    let candidate = base;
    let suffix = 1;
    while (await this.variantsRepo.skuCodeExists(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private async toVariantResponse(
    variant: SelectProductVariant
  ): Promise<VariantResponseDto> {
    const [attributes, media, totalStock] = await Promise.all([
      this.variantsRepo.listAttributes(variant.id),
      this.variantsRepo.listVariantMedia(variant.id),
      this.variantsRepo.totalAvailableStock(variant.id),
    ]);

    return new VariantResponseDto({
      ...variant,
      totalStock,
      attributes,
      media: media.map((m) => ({
        mediaId: m.mediaId,
        imageUrl: this.imageUpload.resolveUrl(m.imageKey),
        imageAlt: m.imageAlt,
        sortOrder: m.sortOrder,
      })),
    });
  }
}
