import { Injectable } from '@nestjs/common';
import { BrandsRepository } from './brands.repository';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { BrandResponseDto } from './dto/response-brand.dto';
import { SelectBrands } from '../../infrastructure/database/schema';
import { UpdateBrandDTO } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  // Response menggunakan type dari BrandResponseDto
  private toBrandResponse(data: SelectBrands): BrandResponseDto {
    return new BrandResponseDto(data);
  }

  async findById(id: number): Promise<BrandResponseDto> {
    const brand = await this.brandsRepository.findById(id);
    if (!brand) {
      // throw error dari brand exception not found
      throw new Error();
    }

    return this.toBrandResponse(brand);
  }

  async findBySlug(slug: string): Promise<BrandResponseDto> {
    const brand = await this.brandsRepository.findBySlug(slug);

    if (!brand) {
      // throw error dari brand exception not found
      throw new Error();
    }

    return this.toBrandResponse(brand);
  }

  async findAll(): Promise<BrandResponseDto[]> {
    const brands = await this.brandsRepository.findAll();
    return brands.map((brand) => this.toBrandResponse(brand));
  }

  /**
   *
   * @param dto data payload dari frontend
   * Jika nanti menggunakan file atau tidak menggunakan assign url
   * tambahkan
   * @param file dengan type file dari multer
   */
  async createBrand(dto: CreateBrandDTO): Promise<BrandResponseDto> {
    /**
     * TODO
     *
     * Buat variable imageUrl untuk menyimpan hasil return dari storage/image service
     * jika upload gagal atau insert gagal variable digunakan untuk menghapus
     * path yang ada di storage
     */
    try {
      /**
       * TODO
       *
       * cek jika parameter file ada maka upload image menggunakan storage/image service
       */

      const brand = await this.brandsRepository.insert(dto);

      return this.toBrandResponse(brand);
    } catch (error) {
      // hapus variable image jika insert gagal
      console.log(error);
      throw error;
    }
  }

  async updateBrand(
    id: number,
    dto: UpdateBrandDTO
  ): Promise<BrandResponseDto> {
    // let imageUrl: string | null = null;

    try {
      const existing = await this.brandsRepository.findById(id);
      if (!existing) {
        // throw BrandNotFoundException
        throw new Error();
      }

      // TODO: kalau ada file baru → upload → simpan ke imageUrl
      // imageUrl = await this.storageService.upload(file);

      const brand = await this.brandsRepository.update(id, {
        ...dto,
        // logo: imageUrl ?? existing.logo
      });

      return this.toBrandResponse(brand);
    } catch (error) {
      // Rollback: hapus image baru dari storage kalau update gagal
      // if (imageUrl) {
      //   // await this.storageService.delete(imageUrl);
      // }
      console.log(error);
      throw error;
    }
  }

  async deleteBrand(id: number): Promise<void> {
    const existing = await this.brandsRepository.findById(id);
    if (!existing) {
      // throw BrandNotFoundException
      throw new Error();
    }

    await this.brandsRepository.softDelete(id);
  }
}
