import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CartItemEntity, MappedCart, MappedCartItem } from '../entities/cart.entity';

@Injectable()
export class CartFactoryService {
  // ─── Build Cart Item from Product ─────────────────────────────
  buildCartItem(product: any, quantity: number): CartItemEntity {
    const item = new CartItemEntity();
    item.product = new Types.ObjectId(product._id);
    item.quantity = quantity;
    item.lockedPrice = product.price;
    item.lockedDiscountPrice = product.discountPrice ?? null;
    item.priceChanged = false;
    item.currentPrice = product.price;
    item.productName = product.name;
    item.productImage = product.images?.[0]?.url ?? null;
    return item;
  }

  // ─── Map Cart for Frontend ────────────────────────────────────
  mapCart(cart: any): MappedCart {
    const warnings: string[] = [];
    let subtotal = 0;
    let totalQuantity = 0;

    const mappedItems: MappedCartItem[] = (cart.items ?? []).map((item: any) => {
      const product = item.product;

      const isAvailable =
        product &&
        !product.isDeleted &&
        product.isActive &&
        product.stock > 0;

      if (!isAvailable) {
        warnings.push(`"${item.productName}" is no longer available`);
      }

      const currentRawPrice = product?.price ?? item.lockedPrice;
      const currentDiscountPrice = product?.discountPrice ?? null;
      const currentEffectivePrice = currentDiscountPrice ?? currentRawPrice;
      const lockedEffectivePrice = item.lockedDiscountPrice ?? item.lockedPrice;

      const priceChanged = currentEffectivePrice !== lockedEffectivePrice;
      const priceDifference = priceChanged
        ? currentEffectivePrice - lockedEffectivePrice
        : null;

      if (priceChanged) {
        const direction = (priceDifference ?? 0) > 0 ? 'increased' : 'decreased';
        warnings.push(
          `Price for "${item.productName}" has ${direction} from ${lockedEffectivePrice} to ${currentEffectivePrice}`,
        );
      }

      if (product && product.stock < item.quantity) {
        warnings.push(
          `Only ${product.stock} units available for "${item.productName}" (you have ${item.quantity})`,
        );
      }

      const itemTotal = lockedEffectivePrice * item.quantity;
      subtotal += itemTotal;
      totalQuantity += item.quantity;

      return {
        product: {
          id: product?._id?.toString() ?? item.product?.toString(),
          name: item.productName,
          slug: product?.slug ?? '',
          // ─── FIXED: أضفنا sku هنا عشان الـ order factory يلاقيه ──
          sku: product?.sku ?? '',
          image: item.productImage,
          isAvailable,
        },
        quantity: item.quantity,
        lockedPrice: item.lockedPrice,
        lockedDiscountPrice: item.lockedDiscountPrice,
        currentPrice: currentEffectivePrice,
        effectivePrice: lockedEffectivePrice,
        itemTotal,
        priceChanged,
        priceDifference,
      };
    });

    const couponSaving = cart.couponDiscount ?? 0;
    const total = subtotal - couponSaving;

    return {
      id: cart._id?.toString(),
      couponCode: cart.couponCode ?? null,
      couponDiscount: cart.couponDiscount, // قيمة الخصم الفعلية
      couponSaving,
      items: mappedItems,
      subtotal,
      total,
      totalItems: mappedItems.length,
      totalQuantity,
      hasPriceChanges: warnings.some((w) => w.includes('Price')),
      warnings,
    };
  }
}