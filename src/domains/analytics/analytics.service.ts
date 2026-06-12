import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsRepository } from './analytics.repository';
import {
  averageOrderValue,
  DateRange,
  lastYearRange,
  pctChange,
  previousRange,
} from './analytics.util';
import { RangeQueryDTO } from './dto/range-query.dto';
import { SeriesQueryDTO } from './dto/series-query.dto';
import { BestSellersQueryDTO } from './dto/best-sellers-query.dto';
import { ConversionQueryDTO } from './dto/conversion-query.dto';
import { SlowMovingQueryDTO } from './dto/slow-moving-query.dto';
import { AlertsQueryDTO } from './dto/alerts-query.dto';
import { ProductViewDTO } from './dto/product-view.dto';
import {
  BestSellersResponseDto,
  GrowthPct,
  PeriodTotals,
  ProductConversionResponseDto,
  SalesByCategoryResponseDto,
  SalesSeriesResponseDto,
  SalesSummaryResponseDto,
  SlowMovingResponseDto,
  StockAlertsResponseDto,
} from './dto/response-analytics.dto';
import { AppException } from '../../common/exceptions/app-exceptions';
import { ERROR_CODES } from '../../common/exceptions/error-codes.constant';
import { ProductNotFoundException } from '../../common/exceptions/domains/product.exceptions';

const DEFAULT_RANGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;
const DEFAULT_SLOW_MOVING_DAYS = 60;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly config: ConfigService
  ) {}

  // ---------- sales & revenue ----------

  /**
   * Ringkasan penjualan + growth: dibandingkan dengan periode tepat
   * sebelumnya berdurasi sama (MoM-style) dan periode sama tahun lalu (YoY).
   */
  async salesSummary(query: RangeQueryDTO): Promise<SalesSummaryResponseDto> {
    const range = this.resolveRange(query);
    const previous = previousRange(range);
    const lastYear = lastYearRange(range);

    const [current, prev, yoy, refund, created, cancelled, expired] =
      await Promise.all([
        this.periodTotals(range),
        this.periodTotals(previous),
        this.periodTotals(lastYear),
        this.analyticsRepository.refundTotals(range),
        this.analyticsRepository.createdCount(range),
        this.analyticsRepository.cancelledCount(range, 'CANCELLED'),
        this.analyticsRepository.cancelledCount(range, 'EXPIRED'),
      ]);

    return new SalesSummaryResponseDto({
      range: this.rangeIso(range),
      current,
      previousPeriod: prev,
      growthVsPrevious: this.growth(current, prev),
      lastYearPeriod: yoy,
      growthVsLastYear: this.growth(current, yoy),
      refund: {
        count: refund.count,
        amount: refund.amount,
        ratePct:
          current.orders > 0
            ? Math.round((refund.count / current.orders) * 1000) / 10
            : 0,
      },
      cancellation: {
        created,
        cancelled,
        expired,
        ratePct:
          created > 0
            ? Math.round(((cancelled + expired) / created) * 1000) / 10
            : 0,
      },
    });
  }

  /** Time series revenue/order/AOV per hari|minggu|bulan. */
  async salesSeries(query: SeriesQueryDTO): Promise<SalesSeriesResponseDto> {
    const range = this.resolveRange(query);
    const interval = query.interval ?? 'day';

    const rows = await this.analyticsRepository.series(
      interval,
      range,
      this.timezone()
    );
    return new SalesSeriesResponseDto({
      range: this.rangeIso(range),
      interval,
      points: rows.map((row) => ({
        bucket: row.bucket,
        revenue: row.revenue,
        orders: row.orders,
        aov: averageOrderValue(row.revenue, row.orders),
      })),
    });
  }

  async salesByCategory(
    query: RangeQueryDTO
  ): Promise<SalesByCategoryResponseDto> {
    const range = this.resolveRange(query);
    return new SalesByCategoryResponseDto({
      range: this.rangeIso(range),
      rows: await this.analyticsRepository.salesByCategory(range),
    });
  }

  // ---------- product ----------

  async bestSellers(
    query: BestSellersQueryDTO
  ): Promise<BestSellersResponseDto> {
    const range = this.resolveRange(query);
    const sort = query.sort ?? 'quantity';
    return new BestSellersResponseDto({
      range: this.rangeIso(range),
      sort,
      rows: await this.analyticsRepository.bestSellers(
        range,
        query.limit ?? DEFAULT_LIMIT,
        sort
      ),
    });
  }

  async slowMoving(query: SlowMovingQueryDTO): Promise<SlowMovingResponseDto> {
    const days = query.days ?? DEFAULT_SLOW_MOVING_DAYS;
    const rows = await this.analyticsRepository.slowMoving(
      days,
      query.limit ?? 20
    );
    return new SlowMovingResponseDto({
      days,
      rows: rows.map((row) => ({
        variantId: row.variantId,
        productId: row.productId,
        productName: row.productName,
        variantName: row.variantName,
        skuCode: row.skuCode,
        availableStock: row.availableStock,
        stockValue: row.stockValue,
        lastSoldAt:
          row.lastSoldAt === null
            ? null
            : new Date(row.lastSoldAt).toISOString(),
      })),
    });
  }

  async stockAlerts(query: AlertsQueryDTO): Promise<StockAlertsResponseDto> {
    const threshold = query.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const rows = await this.analyticsRepository.stockAlerts(
      threshold,
      query.outletId
    );
    return new StockAlertsResponseDto({
      threshold,
      outOfStock: rows.filter((row) => row.availableStock <= 0),
      lowStock: rows.filter((row) => row.availableStock > 0),
    });
  }

  async productConversion(
    query: ConversionQueryDTO
  ): Promise<ProductConversionResponseDto> {
    const range = this.resolveRange(query);
    const rows = await this.analyticsRepository.productConversion(
      range,
      query.limit ?? 20
    );
    return new ProductConversionResponseDto({
      range: this.rangeIso(range),
      rows: rows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        views: row.views,
        purchased: row.purchased,
        conversionPct:
          row.views > 0
            ? Math.round((row.purchased / row.views) * 1000) / 10
            : null,
      })),
    });
  }

  // ---------- event tracking ----------

  /** Catat view halaman produk (dipanggil FE, publik + throttled). */
  async recordProductView(dto: ProductViewDTO): Promise<void> {
    if (!(await this.analyticsRepository.productExists(dto.productId))) {
      throw ProductNotFoundException({ details: { id: dto.productId } });
    }
    await this.analyticsRepository.insertView(
      dto.productId,
      dto.variantId ?? null
    );
  }

  // ---------- helpers ----------

  /** Default 30 hari terakhir; `to` eksklusif. */
  private resolveRange(query: RangeQueryDTO): DateRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);

    if (from.getTime() >= to.getTime()) {
      throw new AppException({
        code: ERROR_CODES.VALIDATION_FAILED,
        category: 'VALIDATION',
        message: 'Parameter `from` harus sebelum `to`.',
        status: HttpStatus.BAD_REQUEST,
        details: { from: from.toISOString(), to: to.toISOString() },
      });
    }
    return { from, to };
  }

  private async periodTotals(range: DateRange): Promise<PeriodTotals> {
    const totals = await this.analyticsRepository.paidTotals(range);
    return {
      revenue: totals.revenue,
      orders: totals.orders,
      aov: averageOrderValue(totals.revenue, totals.orders),
    };
  }

  private growth(current: PeriodTotals, baseline: PeriodTotals): GrowthPct {
    return {
      revenuePct: pctChange(current.revenue, baseline.revenue),
      ordersPct: pctChange(current.orders, baseline.orders),
      aovPct: pctChange(current.aov, baseline.aov),
    };
  }

  private rangeIso(range: DateRange): { from: string; to: string } {
    return { from: range.from.toISOString(), to: range.to.toISOString() };
  }

  private timezone(): string {
    return this.config.get<string>('ANALYTICS_TIMEZONE') ?? 'Asia/Jakarta';
  }
}
