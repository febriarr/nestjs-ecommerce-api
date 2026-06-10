import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDTO } from './dto/create-category.dto';
import { UpdateCategoryDTO } from './dto/update-category.dto';
import {
  CategoryResponseDto,
  CategoryTreeDto,
} from './dto/response-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll();
  }

  @Get('tree')
  async tree(): Promise<CategoryTreeDto[]> {
    return this.categoriesService.tree();
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() dto: CreateCategoryDTO,
    @UploadedFile() image?: Express.Multer.File
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDTO,
    @UploadedFile() image?: Express.Multer.File
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto, image);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.softDelete(id);
  }
}
