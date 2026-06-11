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
  Query,
} from '@nestjs/common';
import { OutletsService } from './outlets.service';
import { CreateOutletDTO } from './dto/create-outlet.dto';
import { UpdateOutletDTO } from './dto/update-outlet.dto';
import { OutletQueryDTO } from './dto/outlet-query.dto';
import { OutletResponseDto } from './dto/response-outlet.dto';
import { SetInventoryDTO } from './dto/set-inventory.dto';
import { InventoryResponseDto } from './dto/response-inventory.dto';
import { MovementResponseDto } from './dto/response-movement.dto';
import { WithMetadata } from '../../common/types/api-response.type';
import { CursorQueryDTO } from '../../common/dto/cursor-query.dto';

@Controller('outlets')
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  async list(
    @Query() query: OutletQueryDTO
  ): Promise<WithMetadata<OutletResponseDto[]>> {
    return this.outletsService.list(query);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<OutletResponseDto> {
    return this.outletsService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateOutletDTO): Promise<OutletResponseDto> {
    return this.outletsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOutletDTO
  ): Promise<OutletResponseDto> {
    return this.outletsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.outletsService.softDelete(id);
  }

  // ---------- inventory ----------

  @Get(':id/inventory')
  async listInventory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: OutletQueryDTO
  ): Promise<WithMetadata<InventoryResponseDto[]>> {
    return this.outletsService.listInventory(id, query);
  }

  @Get(':id/inventory/:variantId')
  async getInventory(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number
  ): Promise<InventoryResponseDto> {
    return this.outletsService.getInventory(id, variantId);
  }

  @Put(':id/inventory/:variantId')
  async setInventory(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: SetInventoryDTO
  ): Promise<InventoryResponseDto> {
    return this.outletsService.setInventory(id, variantId, dto);
  }

  /** Jejak audit stok (ledger append-only) sebuah variant di outlet ini. */
  @Get(':id/inventory/:variantId/movements')
  async listMovements(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
    @Query() query: CursorQueryDTO
  ): Promise<WithMetadata<MovementResponseDto[]>> {
    return this.outletsService.listMovements(id, variantId, query);
  }
}
