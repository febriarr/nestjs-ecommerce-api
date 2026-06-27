import { Injectable } from '@nestjs/common';
import { AttributesRepository } from './attributes.repository';
import { CreateAttributeDTO } from './dto/create-attribute.dto';
import { UpdateAttributeDTO } from './dto/update-attribute.dto';
import {
  AttributeResponseDto,
  AttributeWithValuesResponseDto,
} from './dto/response-attribute.dto';
import { CreateAttributeValueDTO } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDTO } from './dto/update-attribute-value.dto';
import { AttributeValueResponseDto } from './dto/response-attribute-value.dto';
import {
  SelectAttribute,
  SelectAttributeValues,
} from '../../infrastructure/database/schema';
import {
  AttributeNameConflictException,
  AttributeNotFoundException,
  AttributeValueConflictException,
  AttributeValueNotFoundException,
} from '../../common/exceptions/domains/attribute.exceptions';

@Injectable()
export class AttributesService {
  constructor(private readonly repo: AttributesRepository) {}

  // ---------- attributes ----------

  async create(dto: CreateAttributeDTO): Promise<AttributeResponseDto> {
    if (await this.repo.findByName(dto.name))
      throw AttributeNameConflictException({ details: { name: dto.name } });
    const row = await this.repo.insert({
      name: dto.name,
      displayName: dto.displayName,
      type: dto.type,
    });
    return new AttributeResponseDto(row);
  }

  async findAll(): Promise<AttributeResponseDto[]> {
    const rows = await this.repo.findAll();
    return rows.map((r) => new AttributeResponseDto(r));
  }

  async findById(id: number): Promise<AttributeResponseDto> {
    const row = await this.getAttributeOrThrow(id);
    return new AttributeResponseDto(row);
  }

  async findAttributesWithValues(): Promise<AttributeWithValuesResponseDto[]> {
    const rows = await this.repo.findAttributesWithValues();

    return rows.map(
      (row) =>
        new AttributeWithValuesResponseDto({
          ...row,
          values: row.values,
        })
    );
  }

  async update(
    id: number,
    dto: UpdateAttributeDTO
  ): Promise<AttributeResponseDto> {
    const existing = await this.getAttributeOrThrow(id);
    if (dto.name && dto.name !== existing.name) {
      if (await this.repo.findByName(dto.name))
        throw AttributeNameConflictException({ details: { name: dto.name } });
    }
    const row = await this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.displayName !== undefined
        ? { displayName: dto.displayName }
        : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
    });
    return new AttributeResponseDto(row);
  }

  async softDelete(id: number): Promise<void> {
    await this.getAttributeOrThrow(id);
    await this.repo.softDelete(id);
  }

  // ---------- attribute values ----------

  async addValue(
    attributeId: number,
    dto: CreateAttributeValueDTO
  ): Promise<AttributeValueResponseDto> {
    await this.getAttributeOrThrow(attributeId);
    if (await this.repo.findValueByValue(attributeId, dto.value))
      throw AttributeValueConflictException({
        details: { attributeId, value: dto.value },
      });

    const row = await this.repo.insertValue({
      attributeId,
      value: dto.value,
      displayValue: dto.displayValue ?? null,
      colorHex: dto.colorHex ?? null,
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return new AttributeValueResponseDto(row);
  }

  async listValues(attributeId: number): Promise<AttributeValueResponseDto[]> {
    await this.getAttributeOrThrow(attributeId);
    const rows = await this.repo.listValues(attributeId);
    return rows.map((r) => new AttributeValueResponseDto(r));
  }

  async updateValue(
    attributeId: number,
    valueId: number,
    dto: UpdateAttributeValueDTO
  ): Promise<AttributeValueResponseDto> {
    const existing = await this.getValueOrThrow(attributeId, valueId);
    if (dto.value && dto.value !== existing.value) {
      if (await this.repo.findValueByValue(attributeId, dto.value))
        throw AttributeValueConflictException({
          details: { attributeId, value: dto.value },
        });
    }
    const row = await this.repo.updateValue(valueId, {
      ...(dto.value !== undefined ? { value: dto.value } : {}),
      ...(dto.displayValue !== undefined
        ? { displayValue: dto.displayValue }
        : {}),
      ...(dto.colorHex !== undefined ? { colorHex: dto.colorHex } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });
    return new AttributeValueResponseDto(row);
  }

  async removeValue(attributeId: number, valueId: number): Promise<void> {
    await this.getValueOrThrow(attributeId, valueId);
    await this.repo.softDeleteValue(valueId);
  }

  // ---------- helpers ----------

  private async getAttributeOrThrow(id: number): Promise<SelectAttribute> {
    const row = await this.repo.findById(id);
    if (!row) throw AttributeNotFoundException({ details: { id } });
    return row;
  }

  private async getValueOrThrow(
    attributeId: number,
    valueId: number
  ): Promise<SelectAttributeValues> {
    const row = await this.repo.findValueById(valueId);
    if (!row || row.attributeId !== attributeId)
      throw AttributeValueNotFoundException({
        details: { attributeId, valueId },
      });
    return row;
  }
}
