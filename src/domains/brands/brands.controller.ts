import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandsService } from './brands.service';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { UpdateBrandDTO } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/response-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll(): Promise<BrandResponseDto[]> {
    return this.brandsService.findAll();
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BrandResponseDto> {
    return this.brandsService.findById(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<BrandResponseDto> {
    return this.brandsService.findBySlug(slug);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('logo'))
  async createBrand(
    @Body() dto: CreateBrandDTO,
    @UploadedFile() logo?: Express.Multer.File
  ): Promise<BrandResponseDto> {
    return this.brandsService.createBrand(dto, logo);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  async updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDTO,
    @UploadedFile() logo?: Express.Multer.File
  ): Promise<BrandResponseDto> {
    return this.brandsService.updateBrand(id, dto, logo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteBrand(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.brandsService.deleteBrand(id);
  }
}
