import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  WishlistItemEntity,
  MappedWishlist,
  MappedWishlistItem,
} from '../entities/wishlist.entity';

@Injectable()
export class WishlistFactoryService {
  // ─── Build Wishlist Item from Product ─────────────────────────
  buildWishlistItem(product: any): WishlistItemEntity {
    const item = new WishlistItemEntity();
    item.product = new Types.ObjectId(product._id);
    item.snapshotPrice = product.price;
    item.snapshotDiscountPrice = product.discountPrice ?? null;
    item.priceDropped = false;
    item.currentPrice = product.price;
    item.currentDiscountPrice = product.discountPrice ?? null;
    item.notificationSent = false;
    item.productName = product.name;
    item.productImage = product.images?.[0]?.url ?? null;
    item.addedAt = new Date();
    return item;
  }

  // ─── Map Wishlist for Frontend ────────────────────────────────
  mapWishlist(wishlist: any): MappedWishlist {
    let inStockCount = 0;
    let outOfStockCount = 0;
    let priceDropCount = 0;

    const mappedItems: MappedWishlistItem[] = wishlist.items.map((item: any) => {
      const product = item.product;

      // ─── Availability ────────────────────────────────────────
      const inStock = (product?.stock ?? 0) > 0;
      const isAvailable =
        product && !product.isDeleted && product.isActive && inStock;

      if (inStock) inStockCount++;
      else outOfStockCount++;

      // ─── Current effective price ──────────────────────────────
      const currentPrice = product?.price ?? item.currentPrice ?? item.snapshotPrice;
      const currentDiscountPrice = product?.discountPrice ?? null;
      const effectivePrice = currentDiscountPrice ?? currentPrice;

      // ─── Price Drop Detection ─────────────────────────────────
      const snapshotEffective = item.snapshotDiscountPrice ?? item.snapshotPrice;
      const priceDropped = effectivePrice < snapshotEffective;
      const priceDrop = priceDropped
        ? Math.round(snapshotEffective - effectivePrice)
        : null;
      const priceDropPercent = priceDropped
        ? Math.round(((snapshotEffective - effectivePrice) / snapshotEffective) * 100)
        : null;

      if (priceDropped) priceDropCount++;

      return {
        product: {
          id: product?._id?.toString() ?? item.product?.toString(),
          name: item.productName,
          slug: product?.slug ?? '',
          sku: product?.sku ?? '',
          image: item.productImage,
          rating: product?.stats?.averageRating ?? 0,
          totalReviews: product?.stats?.totalReviews ?? 0,
        },
        snapshotPrice: item.snapshotPrice,
        snapshotDiscountPrice: item.snapshotDiscountPrice,
        currentPrice,
        currentDiscountPrice,
        effectivePrice,
        priceDropped,
        priceDrop,
        priceDropPercent,
        stock: product?.stock ?? 0,
        inStock,
        isAvailable,
        addedAt: item.addedAt,
      };
    });

    return {
      id: wishlist._id?.toString(),
      items: mappedItems,
      totalItems: mappedItems.length,
      inStockCount,
      outOfStockCount,
      priceDropCount,
    };
  }
}