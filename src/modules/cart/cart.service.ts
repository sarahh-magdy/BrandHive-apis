import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CartRepository } from '@models/index';
import { ProductRepository } from '@models/index';
import { CartFactoryService } from './factory';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

// ─── Hardcoded coupons (استبدلها بـ Coupon model لاحقاً) ──────────
const VALID_COUPONS: Record<string, number> = {
  SAVE10: 10,
  SAVE20: 20,
  WELCOME: 15,
};

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartFactoryService: CartFactoryService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────
  private async getOrCreateCart(userId: string) {
    let cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!cart) {
      cart = await this.cartRepository.create({
        user: new Types.ObjectId(userId),
        items: [],
        couponCode: null,
        couponDiscount: 0,
      });
    }
    return cart;
  }

  private async validateProduct(productId: string) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isActive: true,
    });
    if (!product) throw new NotFoundException('Product not found or unavailable');
    return product;
  }

  // ════════════════════════════════════════════════════════════════
  // GET CART
  // ════════════════════════════════════════════════════════════════
  async getCart(userId: string) {
    const cart = await this.cartRepository.findCartPopulated(userId);

    if (!cart || (cart as any).items.length === 0) {
      return {
        data: {
          items: [],
          subtotal: 0,
          couponSaving: 0,
          total: 0,
          totalItems: 0,
          totalQuantity: 0,
          hasPriceChanges: false,
          warnings: [],
        },
      };
    }

    // ─── Hybrid: sync الـ currentPrice في الـ DB ─────────────────
    await this.syncPrices(userId, cart);

    // ─── Re-fetch بعد الـ sync ────────────────────────────────────
    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return { data: this.cartFactoryService.mapCart(updatedCart) };
  }

  // ════════════════════════════════════════════════════════════════
  // ADD TO CART
  // ════════════════════════════════════════════════════════════════
  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.validateProduct(dto.productId);

    // ─── Stock validation ──────────────────────────────────────
    if ((product as any).stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${(product as any).stock} units available`,
      );
    }

    const cart = await this.getOrCreateCart(userId);
    const items = [...(cart as any).items];

    const existingIndex = items.findIndex(
      (i: any) => i.product.toString() === dto.productId,
    );

    if (existingIndex >= 0) {
      // ─── Item already in cart → update quantity ────────────────
      const newQty = items[existingIndex].quantity + dto.quantity;

      if (newQty > (product as any).stock) {
        throw new BadRequestException(
          `Cannot add more. Only ${(product as any).stock} units available`,
        );
      }

      items[existingIndex].quantity = newQty;
    } else {
      // ─── New item → build and push ─────────────────────────────
      const newItem = this.cartFactoryService.buildCartItem(product, dto.quantity);
      items.push(newItem);
    }

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: 'Item added to cart',
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // UPDATE CART ITEM
  // ════════════════════════════════════════════════════════════════
  async updateCartItem(userId: string, dto: UpdateCartItemDto) {
    // ─── quantity = 0 → remove item ───────────────────────────────
    if (dto.quantity === 0) {
      return this.removeFromCart(userId, dto.productId);
    }

    const product = await this.validateProduct(dto.productId);

    // ─── Stock validation ──────────────────────────────────────
    if ((product as any).stock < dto.quantity) {
      throw new BadRequestException(
        `Only ${(product as any).stock} units available`,
      );
    }

    const cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!cart) throw new NotFoundException('Cart not found');

    const items = [...(cart as any).items];
    const index = items.findIndex(
      (i: any) => i.product.toString() === dto.productId,
    );

    if (index < 0) throw new NotFoundException('Item not found in cart');

    items[index].quantity = dto.quantity;

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: 'Cart updated',
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // REMOVE FROM CART
  // ════════════════════════════════════════════════════════════════
  async removeFromCart(userId: string, productId: string) {
    const cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!cart) throw new NotFoundException('Cart not found');

    const items = (cart as any).items.filter(
      (i: any) => i.product.toString() !== productId,
    );

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: 'Item removed from cart',
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // CLEAR CART
  // ════════════════════════════════════════════════════════════════
  async clearCart(userId: string) {
    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items: [], couponCode: null, couponDiscount: 0 },
      { new: true },
    );
    return { message: 'Cart cleared successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // APPLY COUPON
  // ════════════════════════════════════════════════════════════════
  async applyCoupon(userId: string, couponCode: string) {
    const discount = VALID_COUPONS[couponCode.toUpperCase()];
    if (!discount) throw new BadRequestException('Invalid or expired coupon code');

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { couponCode: couponCode.toUpperCase(), couponDiscount: discount },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: `Coupon applied! You get ${discount}% off`,
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // REMOVE COUPON
  // ════════════════════════════════════════════════════════════════
  async removeCoupon(userId: string) {
    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { couponCode: null, couponDiscount: 0 },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: 'Coupon removed',
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // MERGE CART (Guest → Logged in)
  // ════════════════════════════════════════════════════════════════
  async mergeCart(userId: string, guestItems: { productId: string; quantity: number }[]) {
    if (!guestItems?.length) return this.getCart(userId);

    const cart = await this.getOrCreateCart(userId);
    const items = [...(cart as any).items];

    for (const guestItem of guestItems) {
      const product = await this.productRepository.getOne({
        _id: new Types.ObjectId(guestItem.productId),
        isDeleted: false,
        isActive: true,
      });

      if (!product) continue; // skip unavailable products

      const existingIndex = items.findIndex(
        (i: any) => i.product.toString() === guestItem.productId,
      );

      if (existingIndex >= 0) {
        const newQty = items[existingIndex].quantity + guestItem.quantity;
        items[existingIndex].quantity = Math.min(newQty, (product as any).stock);
      } else {
        const qty = Math.min(guestItem.quantity, (product as any).stock);
        if (qty > 0) {
          items.push(this.cartFactoryService.buildCartItem(product, qty));
        }
      }
    }

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return {
      message: 'Cart merged successfully',
      data: this.cartFactoryService.mapCart(updatedCart),
    };
  }

  // INTERNAL: used by Order module
  async getCartForOrder(userId: string) {
    const cart = await this.cartRepository.findCartPopulated(userId);
    if (!cart || !(cart as any).items?.length) {
      throw new BadRequestException('Your cart is empty');
    }

    // ─── Final stock validation before order ──────────────────────
    for (const item of (cart as any).items) {
      const product = item.product;
      if (!product || product.isDeleted || !product.isActive) {
        throw new BadRequestException(
          `"${item.productName}" is no longer available. Please update your cart.`,
        );
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Only ${product.stock} units available for "${item.productName}".`,
        );
      }
    }

    return this.cartFactoryService.mapCart(cart);
  }

  // PRIVATE: Hybrid Price Sync
  private async syncPrices(userId: string, cart: any) {
    const items = [...cart.items];
    let changed = false;

    for (const item of items) {
      const product = item.product;
      if (!product) continue;

      const currentPrice = product.price;
      const currentDiscountPrice = product.discountPrice ?? null;

      if (
        item.currentPrice !== currentPrice ||
        item.lockedDiscountPrice !== currentDiscountPrice
      ) {
        const lockedEffective = item.lockedDiscountPrice ?? item.lockedPrice;
        const currentEffective = currentDiscountPrice ?? currentPrice;
        item.priceChanged = lockedEffective !== currentEffective;
        item.currentPrice = currentPrice;
        changed = true;
      }
    }

    if (changed) {
      await this.cartRepository.updateOne(
        { user: new Types.ObjectId(userId) },
        { items },
        { new: true },
      );
    }
  }
}