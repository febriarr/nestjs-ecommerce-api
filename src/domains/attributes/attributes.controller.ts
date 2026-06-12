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
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttributesService } from './attributes.service';
import { CreateAttributeDTO } from './dto/create-attribute.dto';
import { UpdateAttributeDTO } from './dto/update-attribute.dto';
import { AttributeResponseDto } from './dto/response-attribute.dto';
import { CreateAttributeValueDTO } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDTO } from './dto/update-attribute-value.dto';
import { AttributeValueResponseDto } from './dto/response-attribute-value.dto';

@Roles('admin', 'super_admin')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Public()
  @Get()
  async findAll(): Promise<AttributeResponseDto[]> {
    return this.attributesService.findAll();
  }

  @Public()
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number
  ): Promise<AttributeResponseDto> {
    return this.attributesService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAttributeDTO): Promise<AttributeResponseDto> {
    return this.attributesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDTO
  ): Promise<AttributeResponseDto> {
    return this.attributesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attributesService.softDelete(id);
  }

  // ---------- attribute values ----------

  @Public()
  @Get(':id/values')
  async listValues(
    @Param('id', ParseIntPipe) id: number
  ): Promise<AttributeValueResponseDto[]> {
    return this.attributesService.listValues(id);
  }

  @Post(':id/values')
  @HttpCode(HttpStatus.CREATED)
  async addValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeValueDTO
  ): Promise<AttributeValueResponseDto> {
    return this.attributesService.addValue(id, dto);
  }

  @Patch(':id/values/:valueId')
  async updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
    @Body() dto: UpdateAttributeValueDTO
  ): Promise<AttributeValueResponseDto> {
    return this.attributesService.updateValue(id, valueId, dto);
  }

  @Delete(':id/values/:valueId')
  @HttpCode(HttpStatus.OK)
  async removeValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number
  ): Promise<void> {
    return this.attributesService.removeValue(id, valueId);
  }
}
