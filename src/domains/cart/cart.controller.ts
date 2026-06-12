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
  Put,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SelectUser } from '../../infrastructure/database/schema';
import { AddCartItemDTO } from './dto/add-cart-item.dto';
import { UpdateCartItemDTO } from './dto/update-cart-item.dto';
import { SetCartOutletDTO } from './dto/set-cart-outlet.dto';
import { CartResponseDto } from './dto/response-cart.dto';

/** Cart milik user yang sedang login (identitas dari Bearer token). */
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: SelectUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @Put('outlet')
  async setOutlet(
    @CurrentUser() user: SelectUser,
    @Body() dto: SetCartOutletDTO
  ): Promise<CartResponseDto> {
    return this.cartService.setOutlet(user.id, dto);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @CurrentUser() user: SelectUser,
    @Body() dto: AddCartItemDTO
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:variantId')
  async updateItem(
    @CurrentUser() user: SelectUser,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: UpdateCartItemDTO
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, variantId, dto);
  }

  @Delete('items/:variantId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @CurrentUser() user: SelectUser,
    @Param('variantId', ParseIntPipe) variantId: number
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, variantId);
  }

  @Delete('items')
  @HttpCode(HttpStatus.OK)
  async clear(@CurrentUser() user: SelectUser): Promise<CartResponseDto> {
    return this.cartService.clear(user.id);
  }
}
