import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RangeQueryDTO } from './dto/range-query.dto';
import { SeriesQueryDTO } from './dto/series-query.dto';
import { BestSellersQueryDTO } from './dto/best-sellers-query.dto';
import { ConversionQueryDTO } from './dto/conversion-query.dto';
import { SlowMovingQueryDTO } from './dto/slow-moving-query.dto';
import { AlertsQueryDTO } from './dto/alerts-query.dto';
import {
  BestSellersResponseDto,
  ProductConversionResponseDto,
  SalesByCategoryResponseDto,
  SalesSeriesResponseDto,
  SalesSummaryResponseDto,
  SlowMovingResponseDto,
  StockAlertsResponseDto,
} from './dto/response-analytics.dto';

/** Analitik dashboard — read-only, khusus staf internal. */
@Roles('admin', 'super_admin')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** Revenue, order, AOV, refund & cancellation rate + growth MoM/YoY. */
  @Get('sales/summary')
  async salesSummary(
    @Query() query: RangeQueryDTO
  ): Promise<SalesSummaryResponseDto> {
    return this.analyticsService.salesSummary(query);
  }

  /** Time series harian/mingguan/bulanan untuk grafik. */
  @Get('sales/series')
  async salesSeries(
    @Query() query: SeriesQueryDTO
  ): Promise<SalesSeriesResponseDto> {
    return this.analyticsService.salesSeries(query);
  }

  @Get('sales/by-category')
  async salesByCategory(
    @Query() query: RangeQueryDTO
  ): Promise<SalesByCategoryResponseDto> {
    return this.analyticsService.salesByCategory(query);
  }

  @Get('products/best-sellers')
  async bestSellers(
    @Query() query: BestSellersQueryDTO
  ): Promise<BestSellersResponseDto> {
    return this.analyticsService.bestSellers(query);
  }

  /** Stok > 0 tanpa penjualan ≥ N hari (dead stock bila tak pernah terjual). */
  @Get('products/slow-moving')
  async slowMoving(
    @Query() query: SlowMovingQueryDTO
  ): Promise<SlowMovingResponseDto> {
    return this.analyticsService.slowMoving(query);
  }

  /** Views vs purchases per produk (sumber: POST /events/product-view). */
  @Get('products/conversion')
  async productConversion(
    @Query() query: ConversionQueryDTO
  ): Promise<ProductConversionResponseDto> {
    return this.analyticsService.productConversion(query);
  }

  /** Low stock (≤ threshold) & out of stock per outlet. */
  @Get('inventory/alerts')
  async stockAlerts(
    @Query() query: AlertsQueryDTO
  ): Promise<StockAlertsResponseDto> {
    return this.analyticsService.stockAlerts(query);
  }
}
