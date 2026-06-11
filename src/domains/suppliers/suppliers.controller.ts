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
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDTO } from './dto/create-supplier.dto';
import { UpdateSupplierDTO } from './dto/update-supplier.dto';
import { SupplierQueryDTO } from './dto/supplier-query.dto';
import { SupplierResponseDto } from './dto/response-supplier.dto';
import { WithMetadata } from '../../common/types/api-response.type';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async list(
    @Query() query: SupplierQueryDTO
  ): Promise<WithMetadata<SupplierResponseDto[]>> {
    return this.suppliersService.list(query);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplierDTO): Promise<SupplierResponseDto> {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDTO
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.suppliersService.softDelete(id);
  }
}
