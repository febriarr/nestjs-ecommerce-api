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
  Query,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDTO } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDTO } from './dto/update-purchase-order.dto';
import { PoItemInputDTO } from './dto/po-item-input.dto';
import { UpdatePoItemDTO } from './dto/update-po-item.dto';
import { PurchaseOrderQueryDTO } from './dto/po-query.dto';
import { CreateReceiptDTO } from './dto/create-receipt.dto';
import { QuickReceiveDTO } from './dto/quick-receive.dto';
import { PurchaseOrderResponseDto } from './dto/response-purchase-order.dto';
import { ReceiptResponseDto } from './dto/response-receipt.dto';
import { QuickReceiveResponseDto } from './dto/response-quick-receive.dto';
import { WithMetadata } from '../../common/types/api-response.type';

@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Get()
  async list(
    @Query() query: PurchaseOrderQueryDTO
  ): Promise<WithMetadata<PurchaseOrderResponseDto[]>> {
    return this.poService.list(query);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePurchaseOrderDTO
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.create(dto);
  }

  /** "Barang Masuk" 1 langkah: PO + GRN + stok dalam satu transaksi. */
  @Post('quick-receive')
  @HttpCode(HttpStatus.CREATED)
  async quickReceive(
    @Body() dto: QuickReceiveDTO
  ): Promise<QuickReceiveResponseDto> {
    return this.poService.quickReceive(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDTO
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.update(id, dto);
  }

  /** DRAFT → ORDERED (PO terkunci). */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.submit(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.cancel(id);
  }

  // ---------- items (hanya DRAFT) ----------

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PoItemInputDTO
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  async updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdatePoItemDTO
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseIntPipe) itemId: number
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.removeItem(id, itemId);
  }

  // ---------- penerimaan barang ----------

  @Post(':id/receipts')
  @HttpCode(HttpStatus.CREATED)
  async createReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReceiptDTO
  ): Promise<ReceiptResponseDto> {
    return this.poService.createReceipt(id, dto);
  }

  @Get(':id/receipts')
  async listReceipts(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ReceiptResponseDto[]> {
    return this.poService.listReceipts(id);
  }
}
