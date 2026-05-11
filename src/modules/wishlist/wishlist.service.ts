import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { WishlistRepository, ProductRepository } from '@models/index';
import { CartService } from '../cart/cart.service';
import { WishlistFactoryService } from './factory';
import { sendMail } from '@common/helpers/send-mail.helper';
import { AddToWishlistDto, MoveAllToCartDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartService: CartService,
    private readonly wishlistFactoryService: WishlistFactoryService,
    private readonly configService: ConfigService,
  ) { }

  private async getOrCreateWishlist(userId: string) {
    let wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!wishlist) {
      wishlist = await this.wishlistRepository.create({
        user: new Types.ObjectId(userId),
        items: [],
      });
    }
    return wishlist;
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
  // GET WISHLIST
  // ════════════════════════════════════════════════════════════════
  async getWishlist(userId: string) {
    const wishlist = await this.wishlistRepository.findWishlistPopulated(userId);

    if (!wishlist || !(wishlist as any).items?.length) {
      return {
        data: {
          items: [],
          totalItems: 0,
          inStockCount: 0,
          outOfStockCount: 0,
          priceDropCount: 0,
        },
      };
    }

    await this.syncPricesAndNotify(userId, wishlist);
    const updated = await this.wishlistRepository.findWishlistPopulated(userId);
    return { data: this.wishlistFactoryService.mapWishlist(updated) };
  }

  // ════════════════════════════════════════════════════════════════
  // GET WISHLIST COUNT
  // ════════════════════════════════════════════════════════════════
  async getWishlistCount(userId: string) {
    const count = await this.wishlistRepository.getWishlistCount(userId);
    return { data: { count } };
  }

  // ════════════════════════════════════════════════════════════════
  // ADD TO WISHLIST
  // ════════════════════════════════════════════════════════════════
  async addToWishlist(userId: string, dto: AddToWishlistDto) {
    const product = await this.validateProduct(dto.productId);

    const wishlist = await this.getOrCreateWishlist(userId);
    const items = [...(wishlist as any).items];

    const alreadyExists = items.some((i: any) => i.product.toString() === dto.productId);
    if (alreadyExists) throw new ConflictException('Product already in wishlist');

    // ─── ADDED: increment wishlistCount ───────────────────────────
    this.productRepository.incrementWishlistCount(dto.productId).catch(() => null);

    const newItem = this.wishlistFactoryService.buildWishlistItem(product);
    items.push(newItem);

    await this.wishlistRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updated = await this.wishlistRepository.findWishlistPopulated(userId);
    return {
      message: 'Product added to wishlist',
      data: this.wishlistFactoryService.mapWishlist(updated),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // REMOVE FROM WISHLIST
  // ════════════════════════════════════════════════════════════════
  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!wishlist) throw new NotFoundException('Wishlist not found');

    const itemExists = (wishlist as any).items.some(
      (i: any) => i.product.toString() === productId,
    );
    if (!itemExists) throw new NotFoundException('Product not found in wishlist');

    // ─── ADDED: decrement wishlistCount ───────────────────────────
    this.productRepository.decrementWishlistCount(productId).catch(() => null);

    const items = (wishlist as any).items.filter(
      (i: any) => i.product.toString() !== productId,
    );

    await this.wishlistRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items },
      { new: true },
    );

    const updated = await this.wishlistRepository.findWishlistPopulated(userId);
    return {
      message: 'Product removed from wishlist',
      data: this.wishlistFactoryService.mapWishlist(updated),
    };
  }

  // ════════════════════════════════════════════════════════════════
  // CLEAR WISHLIST
  // ════════════════════════════════════════════════════════════════
  async clearWishlist(userId: string) {
    // ─── ADDED: decrement wishlistCount لكل item ──────────────────
    const wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    if (wishlist && (wishlist as any).items?.length) {
      for (const item of (wishlist as any).items) {
        this.productRepository.decrementWishlistCount(item.product.toString()).catch(() => null);
      }
    }

    await this.wishlistRepository.updateOne(
      { user: new Types.ObjectId(userId) },
      { items: [] },
      { new: true },
    );
    return { message: 'Wishlist cleared successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // MOVE TO CART
  // ════════════════════════════════════════════════════════════════
  async moveToCart(userId: string, productId: string) {
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isActive: true,
    });
    if (!product) throw new NotFoundException('Product not found or unavailable');
    if ((product as any).stock === 0) throw new BadRequestException('Product is out of stock');

    const wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    const inWishlist = (wishlist as any)?.items?.some(
      (i: any) => i.product.toString() === productId,
    );
    if (!inWishlist) throw new NotFoundException('Product not found in wishlist');

    await this.cartService.addToCart(userId, { productId, quantity: 1 });
    await this.removeFromWishlist(userId, productId);

    return { message: 'Product moved to cart successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // MOVE ALL TO CART
  // ════════════════════════════════════════════════════════════════
  async moveAllToCart(userId: string, dto: MoveAllToCartDto) {
    const wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    if (!wishlist || !(wishlist as any).items?.length) throw new BadRequestException('Wishlist is empty');

    let targetItems = (wishlist as any).items;
    if (dto.productIds?.length) {
      targetItems = targetItems.filter((i: any) => dto.productIds?.includes(i.product.toString()));
    }

    const results = { moved: [] as string[], skipped: [] as string[] };

    for (const item of targetItems) {
      const productId = item.product.toString();
      try {
        const product = await this.productRepository.getOne({
          _id: item.product,
          isDeleted: false,
          isActive: true,
        });
        if (!product || (product as any).stock === 0) {
          results.skipped.push(item.productName);
          continue;
        }
        await this.cartService.addToCart(userId, { productId, quantity: 1 });
        results.moved.push(item.productName);
      } catch {
        results.skipped.push(item.productName);
      }
    }

    if (results.moved.length) {
      const movedNames = new Set(results.moved);
      const remainingItems = (wishlist as any).items.filter(
        (i: any) => !movedNames.has(i.productName),
      );

      // ─── ADDED: decrement wishlistCount للـ moved items ──────────
      for (const item of (wishlist as any).items) {
        if (movedNames.has(item.productName)) {
          this.productRepository.decrementWishlistCount(item.product.toString()).catch(() => null);
        }
      }

      await this.wishlistRepository.updateOne(
        { user: new Types.ObjectId(userId) },
        { items: remainingItems },
        { new: true },
      );
    }

    return { message: `${results.moved.length} item(s) moved to cart`, data: results };
  }

  // ════════════════════════════════════════════════════════════════
  // CHECK IF IN WISHLIST
  // ════════════════════════════════════════════════════════════════
  async isInWishlist(userId: string, productId: string) {
    const wishlist = await this.wishlistRepository.getOne({ user: new Types.ObjectId(userId) });
    const inWishlist =
      (wishlist as any)?.items?.some((i: any) => i.product.toString() === productId) ?? false;
    return { data: { inWishlist } };
  }

  // ════════════════════════════════════════════════════════════════
  // PRIVATE: Sync Prices + Notify
  // ════════════════════════════════════════════════════════════════
  private async syncPricesAndNotify(userId: string, wishlist: any) {
    const items = [...wishlist.items];
    let changed = false;
    const priceDropItems: string[] = [];

    for (const item of items) {
      const product = item.product;
      if (!product) continue;

      const currentPrice = product.price;
      const currentDiscountPrice = product.discountPrice ?? null;
      const currentEffective = currentDiscountPrice ?? currentPrice;
      const snapshotEffective = item.snapshotDiscountPrice ?? item.snapshotPrice;

      if (item.currentPrice !== currentPrice || item.currentDiscountPrice !== currentDiscountPrice) {
        item.currentPrice = currentPrice;
        item.currentDiscountPrice = currentDiscountPrice;
        changed = true;
      }

      const dropped = currentEffective < snapshotEffective;

      if (dropped && !item.notificationSent) {
        item.priceDropped = true;
        item.notificationSent = true;
        changed = true;
        priceDropItems.push(item.productName);
      }

      if (!dropped && item.priceDropped) {
        item.priceDropped = false;
        item.notificationSent = false;
        changed = true;
      }
    }

    if (changed) {
      await this.wishlistRepository.updateOne(
        { user: new Types.ObjectId(userId) },
        { items },
        { new: true },
      );
    }

    if (priceDropItems.length) {
      await this.sendPriceDropEmail(userId, wishlist, priceDropItems);
    }
  }

  private async sendPriceDropEmail(userId: string, wishlist: any, droppedItems: string[]) {
    const userEmail = wishlist?.user?.email;
    const userName = wishlist?.user?.userName ?? 'there';
    if (!userEmail) return;

    const itemsList = droppedItems.map((name) => `<li style="padding:4px 0">${name}</li>`).join('');

    sendMail({
      to: userEmail,
      subject: '🎉 Price Drop Alert! Items in your wishlist are cheaper now',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
          <h2 style="color:#e74c3c">🎉 Price Drop Alert!</h2>
          <p>Hey <b>${userName}</b>,</p>
          <p>Great news! The following items in your wishlist have dropped in price:</p>
          <ul style="background:#fff8f8;border-left:4px solid #e74c3c;padding:16px 24px;border-radius:4px">
            ${itemsList}
          </ul>
          <p>Don't miss out — grab them before the price goes back up!</p>
          <a href="${this.configService.get('FRONTEND_URL') ?? '#'}/wishlist"
             style="display:inline-block;margin-top:16px;padding:12px 24px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
            View My Wishlist
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            You're receiving this because these items are in your Brand Hive wishlist.
          </p>
        </div>
      `,
    });
  }
}