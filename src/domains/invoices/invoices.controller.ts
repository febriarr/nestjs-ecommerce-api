import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDTO } from './dto/create-invoice.dto';
import { InvoiceResponseDto } from './dto/response-invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(
    @Body() dto: CreateInvoiceDTO
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.createInvoice(dto);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.findById(id);
  }

  /**
   * Tandai invoice PAID lalu picu pipeline generate PDF + kirim email (queue).
   *
   * NOTE: endpoint ini adalah placeholder integration seam. Saat payment webhook
   * dibuat, webhook yang akan memanggil `invoicesService.markAsPaid(id)` setelah
   * verifikasi pembayaran (sekaligus menandai order paid).
   */
  @Post(':id/mark-paid')
  async markPaid(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.markAsPaid(id);
  }

  /** Kirim ulang invoice (re-enqueue generate + email). */
  @Post(':id/send')
  @HttpCode(HttpStatus.ACCEPTED)
  async send(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.requeueDelivery(id);
  }

  /**
   * Unduh PDF invoice. Stream langsung ke response (bypass TransformInterceptor)
   * agar konten biner tidak ikut dibungkus envelope JSON.
   */
  @Get(':id/pdf/download')
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response
  ): Promise<void> {
    const { stream, filename } =
      await this.invoicesService.getInvoicePdfStream(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    stream.pipe(res);
  }
}
