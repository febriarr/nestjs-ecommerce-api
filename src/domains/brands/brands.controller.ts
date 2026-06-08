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
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDTO } from './dto/create-brand.dto';
import { UpdateBrandDTO } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  async findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findById(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBrand(@Body() dto: CreateBrandDTO) {
    return this.brandsService.createBrand(dto);
  }

  @Patch(':id')
  async updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDTO
  ) {
    return this.brandsService.updateBrand(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.deleteBrand(id);
  }
}
