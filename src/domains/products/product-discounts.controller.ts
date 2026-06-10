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
import { ProductDiscountsService } from './product-discounts.service';
import { CreateDiscountDTO } from './dto/create-discount.dto';
import { UpdateDiscountDTO } from './dto/update-discount.dto';
import { DiscountResponseDto } from './dto/response-discount.dto';

@Controller('products/:productId/discounts')
export class ProductDiscountsController {
  constructor(private readonly discountsService: ProductDiscountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateDiscountDTO
  ): Promise<DiscountResponseDto> {
    return this.discountsService.create(productId, dto);
  }

  @Get()
  async list(
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<DiscountResponseDto[]> {
    return this.discountsService.list(productId);
  }

  @Get(':discountId')
  async findById(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('discountId', ParseIntPipe) discountId: number
  ): Promise<DiscountResponseDto> {
    return this.discountsService.findById(productId, discountId);
  }

  @Patch(':discountId')
  async update(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('discountId', ParseIntPipe) discountId: number,
    @Body() dto: UpdateDiscountDTO
  ): Promise<DiscountResponseDto> {
    return this.discountsService.update(productId, discountId, dto);
  }

  @Delete(':discountId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('discountId', ParseIntPipe) discountId: number
  ): Promise<void> {
    return this.discountsService.delete(productId, discountId);
  }
}
