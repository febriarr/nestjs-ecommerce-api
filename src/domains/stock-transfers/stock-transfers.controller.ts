import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { StockTransfersService } from './stock-transfers.service';
import { CreateTransferDTO } from './dto/create-transfer.dto';
import { UpdateTransferDTO } from './dto/update-transfer.dto';
import { ReceiveTransferDTO, SendTransferDTO } from './dto/transfer-action.dto';
import { TransferQueryDTO } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/response-transfer.dto';
import { WithMetadata } from '../../common/types/api-response.type';

@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly transfersService: StockTransfersService) {}

  @Get()
  async list(
    @Query() query: TransferQueryDTO
  ): Promise<WithMetadata<TransferResponseDto[]>> {
    return this.transfersService.list(query);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<TransferResponseDto> {
    return this.transfersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTransferDTO): Promise<TransferResponseDto> {
    return this.transfersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransferDTO
  ): Promise<TransferResponseDto> {
    return this.transfersService.update(id, dto);
  }

  /** DRAFT → SENT: stok keluar dari outlet asal (in transit). */
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendTransferDTO
  ): Promise<TransferResponseDto> {
    return this.transfersService.send(id, dto);
  }

  /** SENT → RECEIVED: stok masuk ke outlet tujuan. */
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveTransferDTO
  ): Promise<TransferResponseDto> {
    return this.transfersService.receive(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<TransferResponseDto> {
    return this.transfersService.cancel(id);
  }
}
