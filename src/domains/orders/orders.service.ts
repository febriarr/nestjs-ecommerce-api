import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { uuidv7 } from 'uuidv7';
import {
  OrdersRepository,
  SelectUserContact,
  VariantPricingView,
} from './orders.repository';
import { OrderQueueProducer } from './orders.queue';
import { CartRepository } from '../cart/cart.repository';
import { OutletsRepository } from '../outlets/outlets.repository';
import { InvoicesService } from '../invoices/invoices.service';
import { CheckoutDTO } from './dto/checkout.dto';
import { CreateOfflineOrderDTO } from './dto/create-offline-order.dto';
import { OrderQueryDTO } from './dto/order-query.dto';
import { OutletOptionsQueryDTO } from './dto/outlet-options-query.dto';
import { OrderItemResponse, OrderResponseDto } from './dto/response-order.dto';
import { OutletOptionResponseDto } from './dto/response-outlet-option.dto';
import {
  OutletCandidateInfo,
  ShippingPoint,
  rankOutlets,
} from './outlet-selection.util';
import { pickTopDiscounts, priceWithDiscount } from '../products/pricing.util';
import {
  InsertOrderItem,
  OrderShippingAddress,
  OrderStatus,
  SelectOrder,
  SelectOrderItem,
  SelectOutlet,
} from '../../infrastructure/database/schema';
import { WithMetadata } from '../../common/types/api-response.type';
import {
  buildStringCursorPage,
  decodeStringCursor,
} from '../../common/pagination/cursor.util';
import { DEFAULT_PAGE_LIMIT } from '../../common/dto/cursor-query.dto';
import { CartEmptyException } from '../../common/exceptions/domains/cart.exceptions';
import {
  OrderContactNotFoundException,
  OrderInvalidStatusTransitionException,
  OrderNotFoundException,
  OrderOutletNotEligibleException,
  OrderStockReservationFailedException,
  OrderUnfulfillableException,
} from '../../common/exceptions/domains/order.exceptions';
import {
  OutletInactiveException,
  OutletNotFoundException,
} from '../../common/exceptions/domains/outlet.exceptions';
import { UserNotFoundException } from '../../common/exceptions/domains/user.exceptions';

/** Item ber-harga final yang siap di-snapshot menjadi order_items. */
interface CheckoutLine extends VariantPricingView {
  quantity: number;
  discountAmount: number;
  finalUnitPrice: number;
}

/** Ketersediaan per item untuk payload error kebijakan A. */
interface ItemAvailabilityDetail {
  variantId: number;
  requested: number;
  bestAvailable: number;
}

const MS_PER_MINUTE = 60_000;
const DEFAULT_EXPIRATION_MINUTES = 30;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly cartRepository: CartRepository,
    private readonly outletsRepository: OutletsRepository,
    private readonly invoicesService: InvoicesService,
    private readonly queueProducer: OrderQueueProducer,
    private readonly config: ConfigService
  ) {}

  // ---------- checkout (ONLINE) ----------

  /**
   * Checkout dari cart: snapshot item (harga setelah diskon) + alamat kirim,
   * pilih outlet (auto/override), RESERVASI stok dalam transaksi (anti
   * overselling), buat invoice terkait, lalu jadwalkan auto-expire.
   */
  async checkout(dto: CheckoutDTO): Promise<OrderResponseDto> {
    const customer = await this.ordersRepository.customerById(dto.userId);
    if (!customer) {
      throw UserNotFoundException({ details: { userId: dto.userId } });
    }

    const contact = await this.ordersRepository.contactById(
      dto.contactId,
      dto.userId
    );
    if (!contact) {
      throw OrderContactNotFoundException({
        details: { contactId: dto.contactId, userId: dto.userId },
      });
    }

    const cart = await this.cartRepository.findByUser(dto.userId);
    const cartItems = cart ? await this.cartRepository.listItems(cart.id) : [];
    if (!cart || cartItems.length === 0) {
      throw CartEmptyException({ details: { userId: dto.userId } });
    }

    const lines = await this.priceLines(
      cartItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }))
    );

    const outlet = await this.selectOutletForOnlineOrder(
      lines,
      contact,
      dto.outletId
    );

    const shippingFee = dto.shippingFee ?? 0;
    const order = await this.placeOrder({
      userId: customer.id,
      outletId: outlet.id,
      channel: 'ONLINE',
      lines,
      shippingFee,
      shippingAddress: this.buildShippingSnapshot(contact),
      customerName: customer.name,
      customerEmail: customer.email,
    });

    await this.cartRepository.clearItems(cart.id);

    return this.toOrderResponse(order);
  }

  // ---------- order OFFLINE (POS) ----------

  /** Order POS: outlet = tempat kasir bertransaksi, tanpa routing & alamat. */
  async createOfflineOrder(
    dto: CreateOfflineOrderDTO
  ): Promise<OrderResponseDto> {
    const customer = await this.ordersRepository.customerById(dto.userId);
    if (!customer) {
      throw UserNotFoundException({ details: { userId: dto.userId } });
    }

    const outlet = await this.outletsRepository.findById(dto.outletId);
    if (!outlet) {
      throw OutletNotFoundException({ details: { id: dto.outletId } });
    }
    if (!outlet.isActive) {
      throw OutletInactiveException({ details: { outletId: outlet.id } });
    }

    const lines = await this.priceLines(dto.items);
    this.assertOutletCanFulfill(
      outlet.id,
      lines,
      await this.availabilityIndex([outlet.id], lines)
    );

    const order = await this.placeOrder({
      userId: customer.id,
      outletId: outlet.id,
      channel: 'OFFLINE',
      lines,
      shippingFee: 0,
      shippingAddress: null,
      customerName: customer.name,
      customerEmail: customer.email,
    });

    return this.toOrderResponse(order);
  }

  // ---------- pemilihan outlet ----------

  /**
   * Daftar outlet servesOnline yang SANGGUP memenuhi seluruh isi cart user,
   * terurut paling direkomendasikan (kota → provinsi → jarak → default).
   */
  async outletOptions(
    query: OutletOptionsQueryDTO
  ): Promise<OutletOptionResponseDto[]> {
    const customer = await this.ordersRepository.customerById(query.userId);
    if (!customer) {
      throw UserNotFoundException({ details: { userId: query.userId } });
    }

    const cart = await this.cartRepository.findByUser(query.userId);
    const cartItems = cart ? await this.cartRepository.listItems(cart.id) : [];
    if (!cart || cartItems.length === 0) {
      throw CartEmptyException({ details: { userId: query.userId } });
    }

    const lines = await this.priceLines(
      cartItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }))
    );

    const contact = query.contactId
      ? await this.ordersRepository.contactById(query.contactId, query.userId)
      : null;

    const candidates = await this.outletsRepository.listOnlineCandidates();
    const index = await this.availabilityIndex(
      candidates.map((candidate) => candidate.id),
      lines
    );
    const capable = candidates.filter((candidate) =>
      this.outletCanFulfill(candidate.id, lines, index)
    );

    const ranked = rankOutlets(
      capable.map((outlet) => this.toCandidateInfo(outlet)),
      this.toShippingPoint(contact)
    );

    return ranked.map(
      (entry) =>
        new OutletOptionResponseDto({
          outletId: entry.outlet.id,
          name: entry.outlet.name,
          code: entry.outlet.code,
          city: entry.outlet.city,
          province: entry.outlet.province,
          distanceKm: entry.distanceKm,
          isOnlineDefault: entry.outlet.isOnlineDefault,
          items: lines.map((line) => ({
            variantId: line.variantId,
            requested: line.quantity,
            availableStock:
              index.get(`${entry.outlet.id}:${line.variantId}`) ?? 0,
          })),
        })
    );
  }

  // ---------- query ----------

  async findById(id: string): Promise<OrderResponseDto> {
    const order = await this.getOrderOrThrow(id);
    return this.toOrderResponse(order);
  }

  async list(query: OrderQueryDTO): Promise<WithMetadata<OrderResponseDto[]>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const rows = await this.ordersRepository.listByUser(
      query.userId,
      query.status,
      decodeStringCursor(query.cursor),
      limit
    );
    const { items, meta } = buildStringCursorPage(rows, limit, (row) => row.id);
    const data = await Promise.all(
      items.map((order) => this.toOrderResponse(order))
    );
    return { data, metadata: meta };
  }

  // ---------- transisi status ----------

  /** Batalkan order PENDING: lepas reservasi stok + invoice di-VOID. */
  async cancel(id: string): Promise<OrderResponseDto> {
    const order = await this.getOrderOrThrow(id);
    const updated = await this.releaseAndTransition(order, 'CANCELLED');
    if (!updated) {
      throw OrderInvalidStatusTransitionException({
        details: { id, from: order.status, to: 'CANCELLED' },
      });
    }
    if (updated.invoiceId) {
      await this.voidInvoiceSafely(updated.invoiceId);
    }
    return this.toOrderResponse(updated);
  }

  /**
   * Dipanggil worker queue saat TTL pembayaran habis. No-op aman bila order
   * sudah PAID/CANCELLED (guard kondisional atomic di repository).
   */
  async expireIfPending(id: string): Promise<void> {
    const order = await this.ordersRepository.findById(id);
    if (!order || order.status !== 'PENDING') return;

    const updated = await this.releaseAndTransition(order, 'EXPIRED');
    if (!updated) return;

    this.logger.log(
      `Order ${updated.orderNumber} kedaluwarsa — reservasi dilepas`
    );
    if (updated.invoiceId) {
      await this.voidInvoiceSafely(updated.invoiceId);
    }
  }

  /**
   * Tandai order PAID (dipanggil payment webhook): finalisasi stok outlet
   * (kurangi stock + lepas reservedStock) dalam transaksi, lalu invoice PAID
   * → pipeline PDF + email berjalan otomatis. Idempotent untuk order PAID.
   */
  async markPaid(id: string): Promise<OrderResponseDto> {
    const order = await this.getOrderOrThrow(id);
    if (order.status === 'PAID') {
      return this.toOrderResponse(order);
    }
    if (order.status !== 'PENDING') {
      throw OrderInvalidStatusTransitionException({
        details: { id, from: order.status, to: 'PAID' },
      });
    }

    const items = await this.ordersRepository.listItems(id);
    const updated = await this.ordersRepository.withTransaction(async (tx) => {
      const row = await this.ordersRepository.updateStatusIf(
        tx,
        id,
        'PENDING',
        {
          status: 'PAID',
          paidAt: new Date(),
        }
      );
      if (!row) return null;

      for (const item of items) {
        const finalized = await this.outletsRepository.finalizeStock(
          tx,
          order.outletId,
          item.variantId,
          item.quantity
        );
        if (!finalized) {
          throw OrderStockReservationFailedException({
            details: {
              orderId: id,
              outletId: order.outletId,
              variantId: item.variantId,
              quantity: item.quantity,
              stage: 'finalize',
            },
          });
        }
      }
      return row;
    });

    if (!updated) {
      // Race dengan transisi lain — baca ulang dan perlakukan idempoten.
      const current = await this.getOrderOrThrow(id);
      if (current.status === 'PAID') return this.toOrderResponse(current);
      throw OrderInvalidStatusTransitionException({
        details: { id, from: current.status, to: 'PAID' },
      });
    }

    if (updated.invoiceId) {
      await this.invoicesService.updatePaymentStatus(updated.invoiceId, {
        status: 'PAID',
      });
    }
    return this.toOrderResponse(updated);
  }

  // ---------- helpers: pricing & availability ----------

  /** Validasi item dapat dibeli + hitung harga setelah diskon aktif. */
  private async priceLines(
    items: { variantId: number; quantity: number }[]
  ): Promise<CheckoutLine[]> {
    const variantIds = items.map((item) => item.variantId);
    const views = await this.ordersRepository.variantsByIds(variantIds);
    const viewByVariant = new Map(views.map((view) => [view.variantId, view]));

    const unpurchasable = items.filter((item) => {
      const view = viewByVariant.get(item.variantId);
      return (
        !view ||
        view.variantStatus !== 'active' ||
        view.productStatus !== 'active'
      );
    });
    if (unpurchasable.length > 0) {
      throw OrderUnfulfillableException({
        message:
          'Sebagian item tidak lagi tersedia untuk dibeli. Hapus item tersebut dari cart.',
        details: {
          unpurchasableVariantIds: unpurchasable.map((item) => item.variantId),
        },
      });
    }

    const discounts = await this.cartRepository.activeDiscountsByProductIds(
      [...new Set(views.map((view) => view.productId))],
      new Date()
    );
    const winners = pickTopDiscounts(discounts);

    return items.map((item) => {
      const view = viewByVariant.get(item.variantId) as VariantPricingView;
      const pricing = priceWithDiscount(
        view.price,
        winners.get(view.productId)
      );
      return {
        ...view,
        quantity: item.quantity,
        discountAmount: pricing.discountAmount,
        finalUnitPrice: pricing.finalUnitPrice,
      };
    });
  }

  /** Index ketersediaan `${outletId}:${variantId}` → available stock. */
  private async availabilityIndex(
    outletIds: number[],
    lines: CheckoutLine[]
  ): Promise<Map<string, number>> {
    const rows = await this.outletsRepository.availability(
      outletIds,
      lines.map((line) => line.variantId)
    );
    return new Map(
      rows.map((row) => [
        `${row.outletId}:${row.variantId}`,
        row.availableStock,
      ])
    );
  }

  private outletCanFulfill(
    outletId: number,
    lines: CheckoutLine[],
    index: Map<string, number>
  ): boolean {
    return lines.every(
      (line) =>
        (index.get(`${outletId}:${line.variantId}`) ?? 0) >= line.quantity
    );
  }

  private assertOutletCanFulfill(
    outletId: number,
    lines: CheckoutLine[],
    index: Map<string, number>
  ): void {
    if (this.outletCanFulfill(outletId, lines, index)) return;
    throw OrderOutletNotEligibleException({
      details: {
        outletId,
        items: lines.map((line) => ({
          variantId: line.variantId,
          requested: line.quantity,
          availableStock: index.get(`${outletId}:${line.variantId}`) ?? 0,
        })),
      },
    });
  }

  /**
   * AUTO-pilih outlet order ONLINE — prioritas:
   * (1) servesOnline + stok cukup untuk SEMUA item,
   * (2) terdekat dengan alamat kirim (kota/provinsi/jarak),
   * (3) fallback isOnlineDefault. User boleh override via `outletId`.
   * Tidak ada yang sanggup → kebijakan A: tolak dengan detail per item.
   */
  private async selectOutletForOnlineOrder(
    lines: CheckoutLine[],
    contact: SelectUserContact,
    overrideOutletId?: number
  ): Promise<SelectOutlet> {
    const candidates = await this.outletsRepository.listOnlineCandidates();
    const index = await this.availabilityIndex(
      candidates.map((candidate) => candidate.id),
      lines
    );

    if (overrideOutletId !== undefined) {
      const chosen = candidates.find(
        (outlet) => outlet.id === overrideOutletId
      );
      if (!chosen) {
        throw OrderOutletNotEligibleException({
          details: { outletId: overrideOutletId, reason: 'not_serving_online' },
        });
      }
      this.assertOutletCanFulfill(chosen.id, lines, index);
      return chosen;
    }

    const capable = candidates.filter((candidate) =>
      this.outletCanFulfill(candidate.id, lines, index)
    );
    if (capable.length === 0) {
      throw OrderUnfulfillableException({
        details: {
          items: this.itemAvailabilityDetails(candidates, lines, index),
        },
      });
    }

    const ranked = rankOutlets(
      capable.map((outlet) => this.toCandidateInfo(outlet)),
      this.toShippingPoint(contact)
    );
    const winnerId = ranked[0].outlet.id;
    return capable.find((outlet) => outlet.id === winnerId) as SelectOutlet;
  }

  private itemAvailabilityDetails(
    candidates: SelectOutlet[],
    lines: CheckoutLine[],
    index: Map<string, number>
  ): ItemAvailabilityDetail[] {
    return lines.map((line) => ({
      variantId: line.variantId,
      requested: line.quantity,
      bestAvailable: candidates.reduce(
        (best, outlet) =>
          Math.max(best, index.get(`${outlet.id}:${line.variantId}`) ?? 0),
        0
      ),
    }));
  }

  // ---------- helpers: pembuatan order ----------

  /**
   * Buat order PENDING: insert order + snapshot item + reservasi stok dalam
   * SATU transaksi; lalu buat invoice & jadwalkan auto-expire. Bila pembuatan
   * invoice gagal, order dibatalkan dan reservasi dilepas (kompensasi).
   */
  private async placeOrder(params: {
    userId: string;
    outletId: number;
    channel: 'ONLINE' | 'OFFLINE';
    lines: CheckoutLine[];
    shippingFee: number;
    shippingAddress: OrderShippingAddress | null;
    customerName: string;
    customerEmail: string;
  }): Promise<SelectOrder> {
    const subtotal = params.lines.reduce(
      (sum, line) => sum + line.price * line.quantity,
      0
    );
    const discountTotal = params.lines.reduce(
      (sum, line) => sum + line.discountAmount * line.quantity,
      0
    );
    const total = subtotal - discountTotal + params.shippingFee;
    const expiresAt = new Date(
      Date.now() + this.expirationMinutes() * MS_PER_MINUTE
    );

    const order = await this.ordersRepository.withTransaction(async (tx) => {
      const created = await this.ordersRepository.insertOrder(tx, {
        orderNumber: this.generateOrderNumber(),
        userId: params.userId,
        outletId: params.outletId,
        channel: params.channel,
        shippingAddress: params.shippingAddress,
        subtotal,
        discountTotal,
        shippingFee: params.shippingFee,
        total,
        expiresAt,
      });

      const itemPayloads: InsertOrderItem[] = params.lines.map((line) => ({
        orderId: created.id,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        variantName: line.variantName,
        skuCode: line.skuCode,
        unitPrice: line.finalUnitPrice,
        discountAmount: line.discountAmount,
        quantity: line.quantity,
        lineTotal: line.finalUnitPrice * line.quantity,
      }));
      await this.ordersRepository.insertOrderItems(tx, itemPayloads);

      for (const line of params.lines) {
        const reserved = await this.outletsRepository.reserveStock(
          tx,
          params.outletId,
          line.variantId,
          line.quantity
        );
        if (!reserved) {
          throw OrderStockReservationFailedException({
            details: {
              outletId: params.outletId,
              variantId: line.variantId,
              quantity: line.quantity,
            },
          });
        }
      }

      return created;
    });

    try {
      const invoice = await this.invoicesService.createInvoice({
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        dueDate: expiresAt.toISOString(),
        items: [
          ...params.lines.map((line) => ({
            description: this.lineDescription(line),
            quantity: line.quantity,
            unitPrice: line.finalUnitPrice,
          })),
          ...(params.shippingFee > 0
            ? [
                {
                  description: 'Ongkos kirim',
                  quantity: 1,
                  unitPrice: params.shippingFee,
                },
              ]
            : []),
        ],
      });
      await this.ordersRepository.linkInvoice(order.id, invoice.id);
      order.invoiceId = invoice.id;
    } catch (error) {
      // Kompensasi: order tanpa invoice tidak boleh menahan stok.
      await this.releaseAndTransition(order, 'CANCELLED');
      throw error;
    }

    await this.queueProducer.enqueueExpire(
      order.id,
      Math.max(0, expiresAt.getTime() - Date.now())
    );
    return order;
  }

  /** Lepas seluruh reservasi + transisi PENDING → CANCELLED/EXPIRED (atomic). */
  private async releaseAndTransition(
    order: SelectOrder,
    to: Extract<OrderStatus, 'CANCELLED' | 'EXPIRED'>
  ): Promise<SelectOrder | null> {
    const items = await this.ordersRepository.listItems(order.id);
    return this.ordersRepository.withTransaction(async (tx) => {
      const updated = await this.ordersRepository.updateStatusIf(
        tx,
        order.id,
        'PENDING',
        { status: to, cancelledAt: new Date() }
      );
      if (!updated) return null;

      for (const item of items) {
        await this.outletsRepository.releaseStock(
          tx,
          order.outletId,
          item.variantId,
          item.quantity
        );
      }
      return updated;
    });
  }

  private async voidInvoiceSafely(invoiceId: string): Promise<void> {
    try {
      await this.invoicesService.updatePaymentStatus(invoiceId, {
        status: 'VOID',
      });
    } catch (error) {
      this.logger.warn(`Gagal mem-VOID invoice ${invoiceId}`, error);
    }
  }

  // ---------- helpers: mapping ----------

  private async getOrderOrThrow(id: string): Promise<SelectOrder> {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw OrderNotFoundException({ details: { id } });
    }
    return order;
  }

  private async toOrderResponse(order: SelectOrder): Promise<OrderResponseDto> {
    const [items, outletName] = await Promise.all([
      this.ordersRepository.listItems(order.id),
      this.ordersRepository.outletNameById(order.outletId),
    ]);

    return new OrderResponseDto({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      outletId: order.outletId,
      outletName,
      channel: order.channel,
      status: order.status,
      invoiceId: order.invoiceId,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      shippingFee: order.shippingFee,
      total: order.total,
      items: items.map((item) => this.toItemResponse(item)),
      expiresAt: order.expiresAt,
      paidAt: order.paidAt,
      cancelledAt: order.cancelledAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  }

  private toItemResponse(item: SelectOrderItem): OrderItemResponse {
    return {
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      skuCode: item.skuCode,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    };
  }

  private toCandidateInfo(outlet: SelectOutlet): OutletCandidateInfo {
    return {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      city: outlet.city,
      province: outlet.province,
      latitude: outlet.latitude,
      longitude: outlet.longitude,
      isOnlineDefault: outlet.isOnlineDefault,
    };
  }

  private toShippingPoint(contact: SelectUserContact | null): ShippingPoint {
    return {
      city: contact?.city ?? null,
      province: contact?.province ?? null,
      latitude: contact?.latitude ?? null,
      longitude: contact?.longitude ?? null,
    };
  }

  private buildShippingSnapshot(
    contact: SelectUserContact
  ): OrderShippingAddress {
    return {
      recipientName: contact.recipientName,
      phone: contact.phone,
      street: contact.street,
      district: contact.district,
      city: contact.city,
      province: contact.province,
      postalCode: contact.postalCode,
      country: contact.country,
      notes: contact.notes,
      latitude: contact.latitude,
      longitude: contact.longitude,
    };
  }

  private lineDescription(line: CheckoutLine): string {
    const name = line.variantName
      ? `${line.productName} - ${line.variantName}`
      : line.productName;
    return `${name} (${line.skuCode})`;
  }

  private expirationMinutes(): number {
    const raw = this.config.get<string>('ORDER_EXPIRATION_MINUTES');
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_EXPIRATION_MINUTES;
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
    ].join('');
    const unique = uuidv7().replace(/-/g, '').slice(-6).toUpperCase();
    return `ORD-${datePart}-${unique}`;
  }
}
