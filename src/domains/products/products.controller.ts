import {
  BadRequestException,
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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDTO } from './dto/create-product.dto';
import { UpdateProductDTO } from './dto/update-product.dto';
import { ProductQueryDTO } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/response-product.dto';
import { CreateProductAttributeDTO } from './dto/create-product-attribute.dto';
import { ProductAttributeResponseDto } from './dto/response-product-attribute.dto';
import { AddProductMediaDTO } from './dto/add-product-media.dto';
import { ReorderMediaDTO } from './dto/reorder-media.dto';
import { SetThumbnailDTO } from './dto/set-thumbnail.dto';
import { ProductMediaResponseDto } from './dto/response-product-media.dto';
import { WithMetadata } from '../../common/types/api-response.type';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDTO): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }

  @Get()
  async list(
    @Query() query: ProductQueryDTO
  ): Promise<WithMetadata<ProductResponseDto[]>> {
    return this.productsService.list(query);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDTO
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productsService.softDelete(id);
  }

  // ---------- attributes ----------

  @Post(':id/attributes')
  @HttpCode(HttpStatus.CREATED)
  async addAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductAttributeDTO
  ): Promise<ProductAttributeResponseDto> {
    return this.productsService.addAttribute(id, dto);
  }

  @Get(':id/attributes')
  async listAttributes(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ProductAttributeResponseDto[]> {
    return this.productsService.listAttributes(id);
  }

  @Delete(':id/attributes/:attributeId')
  @HttpCode(HttpStatus.OK)
  async removeAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Param('attributeId', ParseIntPipe) attributeId: number
  ): Promise<void> {
    return this.productsService.removeAttribute(id, attributeId);
  }

  // ---------- media ----------

  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async addMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddProductMediaDTO,
    @UploadedFile() image?: Express.Multer.File
  ): Promise<ProductMediaResponseDto> {
    if (!image) throw new BadRequestException('File `image` wajib diunggah.');
    return this.productsService.addMedia(id, image.buffer, dto);
  }

  @Get(':id/media')
  async listMedia(
    @Param('id', ParseIntPipe) id: number
  ): Promise<ProductMediaResponseDto[]> {
    return this.productsService.listMedia(id);
  }

  @Patch(':id/media/reorder')
  @HttpCode(HttpStatus.OK)
  async reorderMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderMediaDTO
  ): Promise<void> {
    return this.productsService.reorderMedia(id, dto);
  }

  @Delete(':id/media/:mediaId')
  @HttpCode(HttpStatus.OK)
  async removeMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number
  ): Promise<void> {
    return this.productsService.removeMedia(id, mediaId);
  }

  @Patch(':id/thumbnail')
  async setThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetThumbnailDTO
  ): Promise<ProductResponseDto> {
    return this.productsService.setThumbnail(id, dto.mediaId);
  }
}
