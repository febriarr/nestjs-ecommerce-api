import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  attributes,
  attributeValues,
  InserAttribute,
  InsertAttributeValues,
  SelectAttribute,
  SelectAttributeValues,
} from '../../infrastructure/database/schema';

type AttributesWithValues = SelectAttribute & {
  values: SelectAttributeValues[];
};

@Injectable()
export class AttributesRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  // ---------- attributes ----------

  async findById(id: number): Promise<SelectAttribute | null> {
    const rows = await this.db
      .select()
      .from(attributes)
      .where(and(isNull(attributes.deletedAt), eq(attributes.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByName(name: string): Promise<SelectAttribute | null> {
    const rows = await this.db
      .select()
      .from(attributes)
      .where(and(isNull(attributes.deletedAt), eq(attributes.name, name)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<SelectAttribute[]> {
    return this.db
      .select()
      .from(attributes)
      .where(isNull(attributes.deletedAt))
      .orderBy(attributes.name);
  }

  async findAttributesWithValues(): Promise<AttributesWithValues[]> {
    return this.db.query.attributes.findMany({
      where: isNull(attributes.deletedAt),
      with: {
        values: {
          orderBy: desc(attributeValues.createdAt),
        },
      },
      orderBy: asc(attributes.createdAt),
    });
  }

  async insert(payload: InserAttribute): Promise<SelectAttribute> {
    const [row] = await this.db.insert(attributes).values(payload).returning();
    return row;
  }

  async update(
    id: number,
    payload: Partial<InserAttribute>
  ): Promise<SelectAttribute> {
    const [row] = await this.db
      .update(attributes)
      .set(payload)
      .where(eq(attributes.id, id))
      .returning();
    return row;
  }

  async softDelete(id: number): Promise<void> {
    await this.db
      .update(attributes)
      .set({ deletedAt: new Date() })
      .where(eq(attributes.id, id));
  }

  // ---------- attribute values ----------

  async findValueById(id: number): Promise<SelectAttributeValues | null> {
    const rows = await this.db
      .select()
      .from(attributeValues)
      .where(and(isNull(attributeValues.deletedAt), eq(attributeValues.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findValueByValue(
    attributeId: number,
    value: string
  ): Promise<SelectAttributeValues | null> {
    const rows = await this.db
      .select()
      .from(attributeValues)
      .where(
        and(
          isNull(attributeValues.deletedAt),
          eq(attributeValues.attributeId, attributeId),
          eq(attributeValues.value, value)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listValues(attributeId: number): Promise<SelectAttributeValues[]> {
    return this.db
      .select()
      .from(attributeValues)
      .where(
        and(
          isNull(attributeValues.deletedAt),
          eq(attributeValues.attributeId, attributeId)
        )
      )
      .orderBy(attributeValues.createdAt, attributeValues.value);
  }

  async insertValue(
    payload: InsertAttributeValues
  ): Promise<SelectAttributeValues> {
    const [row] = await this.db
      .insert(attributeValues)
      .values(payload)
      .returning();
    return row;
  }

  async updateValue(
    id: number,
    payload: Partial<InsertAttributeValues>
  ): Promise<SelectAttributeValues> {
    const [row] = await this.db
      .update(attributeValues)
      .set(payload)
      .where(eq(attributeValues.id, id))
      .returning();
    return row;
  }

  async softDeleteValue(id: number): Promise<void> {
    await this.db
      .update(attributeValues)
      .set({ deletedAt: new Date() })
      .where(eq(attributeValues.id, id));
  }
}
