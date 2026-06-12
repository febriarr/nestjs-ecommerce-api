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
  Res,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDTO } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDTO } from './dto/update-invoice-status.dto';
import { InvoiceResponseDto } from './dto/response-invoice.dto';

@Roles('admin', 'super_admin')
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
   * Ubah status pembayaran (UNPAID/PARTIALLY_PAID/PAID/OVERDUE/VOID) dengan
   * transisi tervalidasi. Mendukung transaksi online maupun offline.
   *
   * NOTE: endpoint ini juga integration seam payment webhook. Saat webhook
   * dibuat, webhook memanggil `invoicesService.updatePaymentStatus(id, ...)`
   * setelah verifikasi pembayaran (sekaligus menandai order paid).
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceStatusDTO
  ): Promise<InvoiceResponseDto> {
    return this.invoicesService.updatePaymentStatus(id, dto);
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
