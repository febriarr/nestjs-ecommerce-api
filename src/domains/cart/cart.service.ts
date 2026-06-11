import { Injectable } from '@nestjs/common';
import { CartItemView, CartRepository } from './cart.repository';
import { OutletsRepository } from '../outlets/outlets.repository';
import { AddCartItemDTO } from './dto/add-cart-item.dto';
import { UpdateCartItemDTO } from './dto/update-cart-item.dto';
import { SetCartOutletDTO } from './dto/set-cart-outlet.dto';
import { CartItemResponse, CartResponseDto } from './dto/response-cart.dto';
import {
  SelectCart,
  SelectOutlet,
  SelectProductDiscount,
} from '../../infrastructure/database/schema';
import { pickTopDiscounts, priceWithDiscount } from '../products/pricing.util';
import {
  CartItemNotFoundException,
  CartStockInsufficientException,
} from '../../common/exceptions/domains/cart.exceptions';
import {
  OutletInactiveException,
  OutletNotFoundException,
} from '../../common/exceptions/domains/outlet.exceptions';
import { VariantNotFoundException } from '../../common/exceptions/domains/product-variant.exceptions';
import { UserNotFoundException } from '../../common/exceptions/domains/user.exceptions';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly outletsRepository: OutletsRepository
  ) {}

  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);
    return this.toCartResponse(cart);
  }

  /**
   * Pilih/ganti outlet cart. Outlet harus aktif & melayani online. Seluruh
   * item otomatis ter-revalidasi terhadap stok outlet baru pada response
   * (lihat isStockSufficient per item) — item TIDAK dihapus otomatis.
   */
  async setOutlet(
    userId: string,
    dto: SetCartOutletDTO
  ): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);

    const outlet = await this.outletsRepository.findById(dto.outletId);
    if (!outlet) {
      throw OutletNotFoundException({ details: { id: dto.outletId } });
    }
    if (!outlet.isActive || !outlet.servesOnline) {
      throw OutletInactiveException({
        details: {
          outletId: outlet.id,
          isActive: outlet.isActive,
          servesOnline: outlet.servesOnline,
        },
      });
    }

    const updated = await this.cartRepository.setOutlet(cart.id, outlet.id);
    return this.toCartResponse(updated);
  }

  /** Tambah item (qty diakumulasi bila item sudah ada). */
  async addItem(userId: string, dto: AddCartItemDTO): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);

    const variant = await this.cartRepository.findPurchasableVariant(
      dto.variantId
    );
    if (!variant) {
      throw VariantNotFoundException({ details: { variantId: dto.variantId } });
    }

    if (cart.outletId !== null) {
      const items = await this.cartRepository.listItems(cart.id);
      const existingQty =
        items.find((item) => item.variantId === dto.variantId)?.quantity ?? 0;
      await this.assertStockSufficient(
        cart.outletId,
        dto.variantId,
        existingQty + dto.quantity
      );
    }

    await this.cartRepository.upsertItem(cart.id, dto.variantId, dto.quantity);
    return this.toCartResponse(cart);
  }

  /** Set qty absolut sebuah item. */
  async updateItem(
    userId: string,
    variantId: number,
    dto: UpdateCartItemDTO
  ): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);

    if (cart.outletId !== null) {
      await this.assertStockSufficient(cart.outletId, variantId, dto.quantity);
    }

    const updated = await this.cartRepository.updateItemQuantity(
      cart.id,
      variantId,
      dto.quantity
    );
    if (!updated) {
      throw CartItemNotFoundException({ details: { variantId } });
    }
    return this.toCartResponse(cart);
  }

  async removeItem(
    userId: string,
    variantId: number
  ): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);
    const deleted = await this.cartRepository.deleteItem(cart.id, variantId);
    if (!deleted) {
      throw CartItemNotFoundException({ details: { variantId } });
    }
    return this.toCartResponse(cart);
  }

  async clear(userId: string): Promise<CartResponseDto> {
    const cart = await this.getCartOrCreate(userId);
    await this.cartRepository.clearItems(cart.id);
    return this.toCartResponse(cart);
  }

  // ---------- helpers ----------

  private async getCartOrCreate(userId: string): Promise<SelectCart> {
    if (!(await this.cartRepository.userExists(userId))) {
      throw UserNotFoundException({ details: { userId } });
    }
    return this.cartRepository.getOrCreate(userId);
  }

  /** Tolak qty yang melebihi available stock outlet (validasi pra-checkout). */
  private async assertStockSufficient(
    outletId: number,
    variantId: number,
    quantity: number
  ): Promise<void> {
    const rows = await this.outletsRepository.availability(
      [outletId],
      [variantId]
    );
    const availableStock = rows[0]?.availableStock ?? 0;
    if (availableStock < quantity) {
      throw CartStockInsufficientException({
        details: { outletId, variantId, requested: quantity, availableStock },
      });
    }
  }

  /**
   * Susun response cart: harga live (diskon aktif prioritas tertinggi per
   * product) + validasi stok seluruh item terhadap outlet terpilih.
   */
  private async toCartResponse(cart: SelectCart): Promise<CartResponseDto> {
    const items = await this.cartRepository.listItems(cart.id);

    const outlet: SelectOutlet | null =
      cart.outletId !== null
        ? await this.outletsRepository.findById(cart.outletId)
        : null;

    const discounts = await this.cartRepository.activeDiscountsByProductIds(
      [...new Set(items.map((item) => item.productId))],
      new Date()
    );
    const winners = pickTopDiscounts(discounts);

    const availability =
      outlet !== null
        ? await this.outletsRepository.availability(
            [outlet.id],
            items.map((item) => item.variantId)
          )
        : [];
    const availableByVariant = new Map<number, number>(
      availability.map((row) => [row.variantId, row.availableStock])
    );

    const itemResponses = items.map((item) =>
      this.toItemResponse(
        item,
        winners.get(item.productId),
        outlet,
        availableByVariant
      )
    );

    const subtotal = itemResponses.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const discountTotal = itemResponses.reduce(
      (sum, item) => sum + item.discountAmount * item.quantity,
      0
    );

    return new CartResponseDto({
      id: cart.id,
      userId: cart.userId,
      outlet:
        outlet === null
          ? null
          : {
              id: outlet.id,
              name: outlet.name,
              code: outlet.code,
              city: outlet.city,
              province: outlet.province,
            },
      items: itemResponses,
      subtotal,
      discountTotal,
      total: subtotal - discountTotal,
      allItemsAvailable:
        outlet === null
          ? null
          : itemResponses.every(
              (item) => item.isPurchasable && item.isStockSufficient === true
            ),
      updatedAt: cart.updatedAt,
    });
  }

  private toItemResponse(
    item: CartItemView,
    discount: SelectProductDiscount | undefined,
    outlet: SelectOutlet | null,
    availableByVariant: Map<number, number>
  ): CartItemResponse {
    const pricing = priceWithDiscount(item.price, discount);
    const availableStock =
      outlet === null ? null : (availableByVariant.get(item.variantId) ?? 0);
    return {
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      skuCode: item.skuCode,
      unitPrice: pricing.unitPrice,
      discountAmount: pricing.discountAmount,
      finalUnitPrice: pricing.finalUnitPrice,
      quantity: item.quantity,
      lineTotal: pricing.finalUnitPrice * item.quantity,
      isPurchasable:
        item.variantStatus === 'active' && item.productStatus === 'active',
      availableStock,
      isStockSufficient:
        availableStock === null ? null : availableStock >= item.quantity,
    };
  }
}
