import { Injectable } from '@nestjs/common';
import { CartItemEntity, MappedCart, MappedCartItem } from '../entities/cart.entity';
import { Types } from 'mongoose';

@Injectable()
export class CartFactoryService {
  
  // ─── بناء عنصر جديد للسلة ──────────────────────────────────────────
  buildCartItem(product: any, quantity: number): CartItemEntity {
    const item = new CartItemEntity();
    item.product = new Types.ObjectId(product._id);
    item.quantity = quantity;
    item.lockedPrice = product.price;
    // نضمن تخزين null بدل 0 لو مفيش خصم
    item.lockedDiscountPrice = (product.discountPrice && product.discountPrice > 0) ? product.discountPrice : null;
    item.priceChanged = false;
    item.currentPrice = product.price;
    item.productName = product.name;
    item.productImage = product.images?.[0]?.url ?? null;
    return item;
  }

  // ─── تحويل بيانات السلة لشكل مناسب للـ Frontend والـ Orders ─────────
  mapCart(cart: any): MappedCart {
    const warnings: string[] = [];
    let subtotal = 0;
    let totalQuantity = 0;

    const mappedItems: MappedCartItem[] = cart.items.map((item: any) => {
      const product = item.product;

      // 1. فحص التوافر
      const isAvailable =
        product &&
        !product.isDeleted &&
        product.isActive &&
        product.stock > 0;

      if (!isAvailable) {
        warnings.push(`"${item.productName}" is no longer available`);
      }

      // 2. حساب الأسعار الحالية (Current Prices)
      const currentRawPrice = product?.price ?? item.lockedPrice;
      const currentDiscountPrice = (product?.discountPrice > 0) ? product.discountPrice : null;
      const currentEffectivePrice = currentDiscountPrice ?? currentRawPrice;

      // 3. حساب الأسعار المثبتة (Locked Prices) - التصليح هنا لضمان عدم وجود أصفار
      // لو الـ lockedDiscountPrice بـ 0 أو null، نستخدم الـ lockedPrice
      const lockedEffectivePrice = (item.lockedDiscountPrice && item.lockedDiscountPrice > 0) 
        ? item.lockedDiscountPrice 
        : item.lockedPrice;

      // 4. فحص هل السعر تغير؟
      const priceChanged = currentEffectivePrice !== lockedEffectivePrice;
      const priceDifference = priceChanged ? currentEffectivePrice - lockedEffectivePrice : null;

      if (priceChanged && priceDifference !== null) {
        const direction = priceDifference > 0 ? 'increased' : 'decreased';
        warnings.push(
          `Price for "${item.productName}" has ${direction} from ${lockedEffectivePrice} to ${currentEffectivePrice}`,
        );
      }

      // 5. فحص المخزون
      if (product && product.stock < item.quantity) {
        warnings.push(
          `Only ${product.stock} units available for "${item.productName}" (you have ${item.quantity})`,
        );
      }

      // 6. حساب الإجماليات
      const itemTotal = lockedEffectivePrice * item.quantity;
      subtotal += itemTotal;
      totalQuantity += item.quantity;

      return {
        product: {
          id: product?._id?.toString() ?? item.product?.toString(),
          name: item.productName,
          slug: product?.slug ?? '',
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

    // 7. حسابات الكوبون والخصم النهائي
    const couponDiscount = cart.couponDiscount ?? 0;
    const couponSaving = Math.round((subtotal * couponDiscount) / 100);
    const total = subtotal - couponSaving;

    return {
      id: cart._id?.toString(),
      items: mappedItems,
      couponCode: cart.couponCode ?? null,
      couponDiscount,
      subtotal,
      couponSaving,
      total,
      totalItems: mappedItems.length,
      totalQuantity,
      hasPriceChanges: warnings.some((w) => w.includes('Price')),
      warnings,
    };
  }
}