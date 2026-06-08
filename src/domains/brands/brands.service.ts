import { Injectable, Logger } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { BrandResponseDto } from './dto/response-brand.dto';
import { SelectBrands } from '../../infrastructure/database/schema';
import { UpdateBrandDTO } from './dto/update-brand.dto';
import { ImageUploadService } from '../../infrastructure/image-processing/image-upload.service';
import { BrandNotFoundException } from '../../common/exceptions/domains/brand.exceptions';

const BRAND_LOGO_PREFIX = 'brands';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(
    private readonly brandsRepository: BrandsRepository,
    private readonly imageUpload: ImageUploadService
  ) {}

  private toBrandResponse(data: SelectBrands): BrandResponseDto {
    return new BrandResponseDto({
      ...data,
      logoUrl: this.imageUpload.resolveUrl(data.logo),
    });
  }

  async findById(id: number): Promise<BrandResponseDto> {
    const brand = await this.getBrandOrThrow(id);
    return this.toBrandResponse(brand);
  }

  async findBySlug(slug: string): Promise<BrandResponseDto> {
    const brand = await this.brandsRepository.findBySlug(slug);
    if (!brand) {
      throw BrandNotFoundException({ details: { slug } });
    }
    return this.toBrandResponse(brand);
  }

  async findAll(): Promise<BrandResponseDto[]> {
    const brands = await this.brandsRepository.findAll();
    return brands.map((brand) => this.toBrandResponse(brand));
  }

  /**
   * Buat brand. Bila `file` ada: validate → convert WebP → upload ke storage,
   * lalu simpan key-nya pada kolom `logo`. Bila insert gagal, objek yang sudah
   * terlanjur ter-upload dihapus agar tidak menjadi orphan.
   *
   * @param dto payload brand.
   * @param file file logo opsional (multipart field `logo`).
   */
  async createBrand(
    dto: CreateBrandDTO,
    file?: Express.Multer.File
  ): Promise<BrandResponseDto> {
    let uploadedKey: string | null = null;

    try {
      if (file) {
        const metadata = await this.imageUpload.uploadImage(
          file.buffer,
          BRAND_LOGO_PREFIX
        );
        uploadedKey = metadata.key;
      }

      const brand = await this.brandsRepository.insert({
        ...dto,
        logo: uploadedKey,
      });

      return this.toBrandResponse(brand);
    } catch (error) {
      if (uploadedKey) {
        await this.safeDeleteImage(uploadedKey);
      }
      throw error;
    }
  }

  /**
   * Update brand. Bila `file` baru ada: upload logo baru lalu set key-nya.
   * Logo lama dihapus setelah update sukses (best-effort). Bila update gagal,
   * logo baru yang terlanjur ter-upload di-rollback.
   */
  async updateBrand(
    id: number,
    dto: UpdateBrandDTO,
    file?: Express.Multer.File
  ): Promise<BrandResponseDto> {
    const existing = await this.getBrandOrThrow(id);

    let newKey: string | null = null;
    if (file) {
      const metadata = await this.imageUpload.uploadImage(
        file.buffer,
        BRAND_LOGO_PREFIX
      );
      newKey = metadata.key;
    }

    let brand: SelectBrands;
    try {
      brand = await this.brandsRepository.update(id, {
        ...dto,
        ...(newKey ? { logo: newKey } : {}),
      });
    } catch (error) {
      if (newKey) {
        await this.safeDeleteImage(newKey);
      }
      throw error;
    }

    // Update sukses: hapus logo lama bila digantikan (tidak memblok response).
    if (newKey && existing.logo) {
      await this.safeDeleteImage(existing.logo);
    }

    return this.toBrandResponse(brand);
  }

  async deleteBrand(id: number): Promise<void> {
    await this.getBrandOrThrow(id);
    // Soft delete: baris (dan logo di storage) dipertahankan agar bisa dipulihkan.
    await this.brandsRepository.softDelete(id);
  }

  private async getBrandOrThrow(id: number): Promise<SelectBrands> {
    const brand = await this.brandsRepository.findById(id);
    if (!brand) {
      throw BrandNotFoundException({ details: { id } });
    }
    return brand;
  }

  /**
   * Hapus objek dari storage tanpa menggagalkan flow utama bila gagal
   * (mis. rollback / pembersihan logo lama).
   */
  private async safeDeleteImage(key: string): Promise<void> {
    try {
      await this.imageUpload.deleteImage(key);
    } catch (error) {
      this.logger.warn(`Gagal menghapus objek storage: ${key}`, error);
    }
  }
}
