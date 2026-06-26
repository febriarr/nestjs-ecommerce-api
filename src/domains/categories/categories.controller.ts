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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDTO } from './dto/create-category.dto';
import { UpdateCategoryDTO } from './dto/update-category.dto';
import {
  CategoryOptionsDTO,
  CategoryResponseDto,
  CategoryTreeDto,
} from './dto/response-category.dto';
import { ReorderCategoriesDTO } from './dto/reorder-category.dto';

@Roles('admin', 'super_admin')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get('tree')
  async tree(): Promise<CategoryTreeDto[]> {
    return this.categoriesService.tree();
  }

  @Public()
  @Get('parents')
  async findParents(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findParents();
  }

  @Public()
  @Get('options')
  async findCategoryOptions(): Promise<CategoryOptionsDTO[]> {
    return this.categoriesService.findCategoryOptions();
  }

  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
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

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(@Body() dto: ReorderCategoriesDTO): Promise<void> {
    return this.categoriesService.reorder(dto);
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
