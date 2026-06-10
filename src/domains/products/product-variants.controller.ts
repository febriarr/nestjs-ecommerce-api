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
import { ProductVariantsService } from './product-variants.service';
import { CreateVariantDTO } from './dto/create-variant.dto';
import { UpdateVariantDTO } from './dto/update-variant.dto';
import { AddVariantMediaDTO } from './dto/add-variant-media.dto';
import { VariantResponseDto } from './dto/response-variant.dto';

@Controller('products/:productId/variants')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateVariantDTO
  ): Promise<VariantResponseDto> {
    return this.variantsService.create(productId, dto);
  }

  @Get()
  async list(
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<VariantResponseDto[]> {
    return this.variantsService.list(productId);
  }

  @Get(':variantId')
  async findById(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number
  ): Promise<VariantResponseDto> {
    return this.variantsService.findById(productId, variantId);
  }

  @Patch(':variantId')
  async update(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateVariantDTO
  ): Promise<VariantResponseDto> {
    return this.variantsService.update(productId, variantId, dto);
  }

  @Delete(':variantId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number
  ): Promise<void> {
    return this.variantsService.softDelete(productId, variantId);
  }

  // ---------- variant media (reuse product_media) ----------

  @Post(':variantId/media')
  @HttpCode(HttpStatus.CREATED)
  async addMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: AddVariantMediaDTO
  ): Promise<void> {
    return this.variantsService.addMedia(productId, variantId, dto);
  }

  @Delete(':variantId/media/:mediaId')
  @HttpCode(HttpStatus.OK)
  async removeMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Param('mediaId', ParseIntPipe) mediaId: number
  ): Promise<void> {
    return this.variantsService.removeMedia(productId, variantId, mediaId);
  }
}
