import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository } from '../../common/abstracts/base.repository';
import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  invoices,
  InsertInvoices,
  SelectInvoices,
} from '../../infrastructure/database/schema';

@Injectable()
export class InvoicesRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findById(id: string): Promise<SelectInvoices | null> {
    const invoice = await this.db.query.invoices.findFirst({
      where: and(isNull(invoices.deletedAt), eq(invoices.id, id)),
    });
    return invoice ?? null;
  }

  async findByNumber(invoiceNumber: string): Promise<SelectInvoices | null> {
    const invoice = await this.db.query.invoices.findFirst({
      where: and(
        isNull(invoices.deletedAt),
        eq(invoices.invoiceNumber, invoiceNumber)
      ),
    });
    return invoice ?? null;
  }

  async insert(payload: InsertInvoices): Promise<SelectInvoices> {
    const [invoice] = await this.db
      .insert(invoices)
      .values(payload)
      .returning();
    return invoice;
  }

  async updatePdfKey(id: string, pdfKey: string): Promise<SelectInvoices> {
    const [invoice] = await this.db
      .update(invoices)
      .set({ pdfKey })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }
}
