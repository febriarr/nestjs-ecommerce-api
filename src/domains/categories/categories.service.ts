import { Injectable, Logger } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { CreateCategoryDTO } from './dto/create-category.dto';
import { UpdateCategoryDTO } from './dto/update-category.dto';
import { ReorderCategoriesDTO } from './dto/reorder-category.dto';
import {
  CategoryResponseDto,
  CategoryTreeDto,
} from './dto/response-category.dto';
import {
  InsertCategories,
  SelectCategories,
} from '../../infrastructure/database/schema';
import {
  CategoryNotFoundException,
  CategorySlugConflictException,
  CategoryReorderLevelMismatchException,
} from '../../common/exceptions/domains/category.exceptions';

const CATEGORY_IMAGE_PREFIX = 'categories';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly repo: CategoriesRepository,
    private readonly imageUpload: ImageUploadService
  ) {}

  async create(
    dto: CreateCategoryDTO,
    file?: Express.Multer.File
  ): Promise<CategoryResponseDto> {
    await this.assertSlugAvailable(dto.slug);
    if (dto.parentId) await this.getCategoryOrThrow(dto.parentId);

    // Auto-assign sortOrder jika tidak dikirim dari request
    let resolvedSortOrder = dto.sortOrder;
    if (resolvedSortOrder === undefined) {
      const lastOrder = await this.repo.findLastSortOrder(dto.parentId ?? null);
      resolvedSortOrder = lastOrder ? lastOrder.sortOrder + 1 : 1;
    }

    let uploadedKey: string | null = null;
    try {
      if (file) {
        const meta = await this.imageUpload.uploadImage(
          file.buffer,
          CATEGORY_IMAGE_PREFIX
        );
        uploadedKey = meta.key;
      }

      const payload: InsertCategories = {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        imageUrl: uploadedKey,
        sortOrder: resolvedSortOrder,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      };

      const row = await this.repo.insert(payload);
      return this.toResponse(row);
    } catch (error) {
      if (uploadedKey) await this.safeDeleteImage(uploadedKey);
      throw error;
    }
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    const rows = await this.repo.findAll();
    return rows.map((r) => this.toResponse(r));
  }

  async tree(): Promise<CategoryTreeDto[]> {
    const rows = await this.repo.findAll();
    const nodeById = new Map<string, CategoryTreeDto>();
    for (const row of rows) {
      nodeById.set(
        row.id,
        new CategoryTreeDto({ ...this.toResponse(row), children: [] })
      );
    }

    const roots: CategoryTreeDto[] = [];
    for (const row of rows) {
      const node = nodeById.get(row.id);
      if (!node) continue;
      const parent = row.parentId ? nodeById.get(row.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const row = await this.getCategoryOrThrow(id);
    return this.toResponse(row);
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const row = await this.repo.findBySlug(slug);
    if (!row) throw CategoryNotFoundException({ details: { slug } });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateCategoryDTO,
    file?: Express.Multer.File
  ): Promise<CategoryResponseDto> {
    const existing = await this.getCategoryOrThrow(id);

    if (dto.slug && dto.slug !== existing.slug)
      await this.assertSlugAvailable(dto.slug);

    if (dto.parentId) {
      if (dto.parentId === id)
        throw CategoryNotFoundException({
          details: { reason: 'parentId tidak boleh diri sendiri' },
        });
      await this.getCategoryOrThrow(dto.parentId);
    }

    // Resolve parentId final: pakai dari payload jika dikirim, fallback ke existing
    const resolvedParentId =
      dto.parentId !== undefined ? dto.parentId : existing.parentId;

    // Auto-assign sortOrder hanya jika tidak dikirim dari request
    let resolvedSortOrder: number;
    if (dto.sortOrder !== undefined) {
      resolvedSortOrder = dto.sortOrder;
    } else {
      const lastOrder = await this.repo.findLastSortOrder(resolvedParentId);
      resolvedSortOrder = lastOrder ? lastOrder.sortOrder + 1 : 1;
    }

    let newKey: string | null = null;
    if (file) {
      const meta = await this.imageUpload.uploadImage(
        file.buffer,
        CATEGORY_IMAGE_PREFIX
      );
      newKey = meta.key;
    }

    let row: SelectCategories;
    try {
      row = await this.repo.update(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        sortOrder: resolvedSortOrder,
        ...(newKey ? { imageUrl: newKey } : {}),
        updatedAt: new Date(),
      });
    } catch (error) {
      if (newKey) await this.safeDeleteImage(newKey);
      throw error;
    }

    // Hapus gambar lama setelah update berhasil
    if (newKey && existing.imageUrl && existing.imageUrl !== newKey)
      await this.safeDeleteImage(existing.imageUrl);

    return this.toResponse(row);
  }

  /**
   * Swap sortOrder antara dua kategori dalam level yang sama.
   * Validasi: keduanya harus ada dan harus berada dalam level yang sama
   * (keduanya parent, atau keduanya child dari parentId yang sama).
   */
  async reorder(dto: ReorderCategoriesDTO): Promise<void> {
    const [a, b] = dto.items;

    const existing = await this.repo.findManyByIds([a.id, b.id]);

    if (existing.length !== 2)
      throw CategoryNotFoundException({
        details: { reason: 'Satu atau kedua kategori tidak ditemukan' },
      });

    const [catA, catB] = existing as [SelectCategories, SelectCategories];

    if (catA.parentId !== catB.parentId)
      throw CategoryReorderLevelMismatchException({
        details: {
          reason: 'Kategori harus berada dalam level yang sama untuk ditukar',
        },
      });

    await this.repo.swapSortOrder(
      { id: a.id, sortOrder: a.sortOrder },
      { id: b.id, sortOrder: b.sortOrder }
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.getCategoryOrThrow(id);
    await this.repo.softDelete(id);
  }

  private async getCategoryOrThrow(id: string): Promise<SelectCategories> {
    const row = await this.repo.findById(id);
    if (!row) throw CategoryNotFoundException({ details: { id } });
    return row;
  }

  private async assertSlugAvailable(slug: string): Promise<void> {
    if (await this.repo.findBySlug(slug))
      throw CategorySlugConflictException({ details: { slug } });
  }

  private toResponse(row: SelectCategories): CategoryResponseDto {
    return new CategoryResponseDto({
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      image: row.imageUrl,
      imageUrl: this.imageUpload.resolveUrl(row.imageUrl),
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private async safeDeleteImage(key: string): Promise<void> {
    try {
      await this.imageUpload.deleteImage(key);
    } catch (error) {
      this.logger.warn(`Gagal menghapus objek storage: ${key}`, error);
    }
  }
}
