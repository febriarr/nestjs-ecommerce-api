import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderIdempotencyKeyMissingException } from '../../common/exceptions/domains/order.exceptions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { SelectUser } from '../../infrastructure/database/schema';
import { CheckoutDTO } from './dto/checkout.dto';
import { CreateOfflineOrderDTO } from './dto/create-offline-order.dto';
import { OrderQueryDTO } from './dto/order-query.dto';
import { OutletOptionsQueryDTO } from './dto/outlet-options-query.dto';
import { OrderResponseDto } from './dto/response-order.dto';
import { OutletOptionResponseDto } from './dto/response-outlet-option.dto';
import { WithMetadata } from '../../common/types/api-response.type';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Daftar outlet yang sanggup memenuhi seluruh isi cart (untuk ganti outlet). */
  @Get('outlet-options')
  async outletOptions(
    @CurrentUser() user: SelectUser,
    @Query() query: OutletOptionsQueryDTO
  ): Promise<OutletOptionResponseDto[]> {
    return this.ordersService.outletOptions(user.id, query);
  }

  /** Order milik user yang sedang login. */
  @Get()
  async list(
    @CurrentUser() user: SelectUser,
    @Query() query: OrderQueryDTO
  ): Promise<WithMetadata<OrderResponseDto[]>> {
    return this.ordersService.list(user.id, query);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: SelectUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<OrderResponseDto> {
    return this.ordersService.findByIdFor(user, id);
  }

  /**
   * Checkout ONLINE dari cart user login. Header `Idempotency-Key` wajib
   * (string unik per percobaan checkout, mis. uuid dari FE) — retry/double
   * click dengan key sama mengembalikan order yang sama, bukan order baru.
   */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @CurrentUser() user: SelectUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CheckoutDTO
  ): Promise<OrderResponseDto> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 100) {
      throw OrderIdempotencyKeyMissingException();
    }
    return this.ordersService.checkout(user.id, dto, key);
  }

  /** Order OFFLINE (POS) — hanya kasir/staf (admin). */
  @Post('offline')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'super_admin')
  async createOffline(
    @Body() dto: CreateOfflineOrderDTO
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOfflineOrder(dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: SelectUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelFor(user, id);
  }
}
