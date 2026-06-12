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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandsService } from './brands.service';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { UpdateBrandDTO } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/response-brand.dto';

@Roles('admin', 'super_admin')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  async findAll(): Promise<BrandResponseDto[]> {
    return this.brandsService.findAll();
  }

  @Public()
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<BrandResponseDto> {
    return this.brandsService.findById(id);
  }

  @Public()
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
