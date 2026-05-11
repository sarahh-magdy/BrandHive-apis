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
import { CouponService } from '@modules/coupon/coupon.service';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartFactoryService: CartFactoryService,
    private readonly couponService: CouponService,
  ) { }

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

    await this.syncPrices(userId, cart);
    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return { data: this.cartFactoryService.mapCart(updatedCart) };
  }

  // ════════════════════════════════════════════════════════════════
  // ADD TO CART
  // ════════════════════════════════════════════════════════════════
  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.validateProduct(dto.productId);

    if ((product as any).stock < dto.quantity) {
      throw new BadRequestException(`Only ${(product as any).stock} units available`);
    }

    const cart = await this.getOrCreateCart(userId);
    const items = [...(cart as any).items];

    const existingIndex = items.findIndex(
      (i: any) => i.product.toString() === dto.productId,
    );

    if (existingIndex >= 0) {
      const newQty = items[existingIndex].quantity + dto.quantity;
      if (newQty > (product as any).stock) {
        throw new BadRequestException(`Cannot add more. Only ${(product as any).stock} units available`);
      }
      items[existingIndex].quantity = newQty;
    } else {
      // ─── ADDED: increment cartCount على الـ product ───────────
      this.productRepository.incrementCartCount(dto.productId).catch(() => null);
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
    if (dto.quantity === 0) {
      return this.removeFromCart(userId, dto.productId);
    }

    const product = await this.validateProduct(dto.productId);

    if ((product as any).stock < dto.quantity) {
      throw new BadRequestException(`Only ${(product as any).stock} units available`);
    }

    const cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!cart) throw new NotFoundException('Cart not found');

    const items = [...(cart as any).items];
    const index = items.findIndex((i: any) => i.product.toString() === dto.productId);
    if (index < 0) throw new NotFoundException('Item not found in cart');

    items[index].quantity = dto.quantity;

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return { message: 'Cart updated', data: this.cartFactoryService.mapCart(updatedCart) };
  }

  // ════════════════════════════════════════════════════════════════
  // REMOVE FROM CART
  // ════════════════════════════════════════════════════════════════
  async removeFromCart(userId: string, productId: string) {
    const cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!cart) throw new NotFoundException('Cart not found');

    const itemExists = (cart as any).items.some(
      (i: any) => i.product.toString() === productId,
    );

    // ─── ADDED: decrement cartCount لو الـ item كان موجود ────────
    if (itemExists) {
      this.productRepository.decrementCartCount(productId).catch(() => null);
    }

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
    // ─── ADDED: decrement cartCount لكل item في الـ cart ─────────
    const cart = await this.cartRepository.getOne({ user: new Types.ObjectId(userId) });
    if (cart && (cart as any).items?.length) {
      for (const item of (cart as any).items) {
        this.productRepository.decrementCartCount(item.product.toString()).catch(() => null);
      }
    }

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
    const cart = await this.cartRepository.findCartPopulated(userId);
    if (!cart || !(cart as any).items.length) throw new BadRequestException('Cart is empty');

    const mappedCart = this.cartFactoryService.mapCart(cart);
    const coupon = await this.couponService.applyCouponOnCart(couponCode, userId, mappedCart.subtotal);

    await this.cartRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      {
        couponCode: coupon.couponCode,
        couponDiscount: coupon.couponDiscount,
        couponId: coupon.couponId,
      },
      { new: true },
    );

    const updatedCart = await this.cartRepository.findCartPopulated(userId);
    return { message: 'Coupon applied successfully', data: this.cartFactoryService.mapCart(updatedCart) };
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
    return { message: 'Coupon removed', data: this.cartFactoryService.mapCart(updatedCart) };
  }

  // ════════════════════════════════════════════════════════════════
  // MERGE CART
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
      if (!product) continue;

      const existingIndex = items.findIndex(
        (i: any) => i.product.toString() === guestItem.productId,
      );

      if (existingIndex >= 0) {
        const newQty = items[existingIndex].quantity + guestItem.quantity;
        items[existingIndex].quantity = Math.min(newQty, (product as any).stock);
      } else {
        const qty = Math.min(guestItem.quantity, (product as any).stock);
        if (qty > 0) {
          // ─── ADDED: increment cartCount ───────────────────────
          this.productRepository.incrementCartCount(guestItem.productId).catch(() => null);
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
    return { message: 'Cart merged successfully', data: this.cartFactoryService.mapCart(updatedCart) };
  }

  // ════════════════════════════════════════════════════════════════
  // GET CART FOR ORDER (internal)
  // ════════════════════════════════════════════════════════════════
  async getCartForOrder(userId: string) {
    console.log('--- Order Process Started ---');
    console.log('Searching for Cart with UserID:', userId);

    const cart = await this.cartRepository.findCartPopulated(userId);

    console.log('Cart found in DB:', cart ? 'YES' : 'NO');
    if (cart) console.log('Number of items in cart:', cart.items?.length);

    if (!cart || !(cart as any).items?.length) {
      throw new BadRequestException('Your cart is empty');
    }

    for (const item of (cart as any).items) {
      const product = item.product;
      if (!product || product.isDeleted || !product.isActive) {
        throw new BadRequestException(`"${item.productName}" is no longer available. Please update your cart.`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Only ${product.stock} units available for "${item.productName}".`);
      }
    }

    return this.cartFactoryService.mapCart(cart);
  }

  // ════════════════════════════════════════════════════════════════
  // PRIVATE: Sync Prices
  // ════════════════════════════════════════════════════════════════
  private async syncPrices(userId: string, cart: any) {
    const items = [...cart.items];
    let changed = false;

    for (const item of items) {
      const product = item.product;
      if (!product) continue;

      const currentPrice = product.price;
      const currentDiscountPrice = product.discountPrice ?? null;

      if (item.currentPrice !== currentPrice || item.lockedDiscountPrice !== currentDiscountPrice) {
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