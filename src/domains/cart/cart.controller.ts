import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDTO } from './dto/add-cart-item.dto';
import { UpdateCartItemDTO } from './dto/update-cart-item.dto';
import { SetCartOutletDTO } from './dto/set-cart-outlet.dto';
import { CartResponseDto } from './dto/response-cart.dto';

/**
 * Cart per user. `userId` masih eksplisit di path (belum ada auth guard —
 * mengikuti konvensi products.createdBy); saat guard tersedia, ganti param
 * ini dengan decorator current-user tanpa menyentuh service.
 */
@Controller('carts/:userId')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(
    @Param('userId', ParseUUIDPipe) userId: string
  ): Promise<CartResponseDto> {
    return this.cartService.getCart(userId);
  }

  @Put('outlet')
  async setOutlet(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetCartOutletDTO
  ): Promise<CartResponseDto> {
    return this.cartService.setOutlet(userId, dto);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AddCartItemDTO
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:variantId')
  async updateItem(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateCartItemDTO
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(userId, variantId, dto);
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('variantId', ParseIntPipe) variantId: number
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(userId, variantId);
  }

  @Delete('items')
  @HttpCode(HttpStatus.OK)
  async clear(
    @Param('userId', ParseUUIDPipe) userId: string
  ): Promise<CartResponseDto> {
    return this.cartService.clear(userId);
  }
}
