import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { Public } from '../auth/decorators/public.decorator';
import { ProductViewDTO } from './dto/product-view.dto';

/** Penerima event ringan dari storefront (anonim, publik + throttled). */
@Controller('events')
export class EventsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** Dipanggil FE setiap halaman produk dibuka — bahan metrik conversion. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @Post('product-view')
  @HttpCode(HttpStatus.CREATED)
  async productView(@Body() dto: ProductViewDTO): Promise<void> {
    return this.analyticsService.recordProductView(dto);
  }
}
