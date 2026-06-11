import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
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
    @Query() query: OutletOptionsQueryDTO
  ): Promise<OutletOptionResponseDto[]> {
    return this.ordersService.outletOptions(query);
  }

  @Get()
  async list(
    @Query() query: OrderQueryDTO
  ): Promise<WithMetadata<OrderResponseDto[]>> {
    return this.ordersService.list(query);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<OrderResponseDto> {
    return this.ordersService.findById(id);
  }

  /** Checkout ONLINE dari cart user. */
  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Body() dto: CheckoutDTO): Promise<OrderResponseDto> {
    return this.ordersService.checkout(dto);
  }

  /** Order OFFLINE (POS): outlet = tempat kasir bertransaksi. */
  @Post('offline')
  @HttpCode(HttpStatus.CREATED)
  async createOffline(
    @Body() dto: CreateOfflineOrderDTO
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOfflineOrder(dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancel(id);
  }
}
