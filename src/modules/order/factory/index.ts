import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  OrderEntity,
  OrderItemEntity,
} from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../models/order/order.schema';
import {
  generateOrderNumber,
  calculateShippingFee,
  calculateTax,
} from '../../../common/helpers/shipping.helper';

@Injectable()
export class OrderFactoryService {
  buildOrder(
    dto: CreateOrderDto,
    userId: string,
    cartSummary: any,
  ): OrderEntity {
    const order = new OrderEntity();
    (order as any)._id = new Types.ObjectId();
    order.orderNumber = generateOrderNumber();
    order.user = new Types.ObjectId(userId);

    // ─── Items from cart (prices already locked) ──────────────
    order.items = (cartSummary.items ?? []).map((item: any): OrderItemEntity => {
      // ─── FIXED: SKU يييجي من أماكن مختلفة حسب الـ populate ──
      // الـ cart mapProduct بيحط الـ product كـ object فيه id, name, sku, image
      // بس لو الـ sku مش موجود نعمل fallback بدل ما نبعت '' ونعمل validation error
      const productId = item.product?.id ?? item.product?.toString?.() ?? 'unknown';
      const sku =
        (item.product?.sku && item.product.sku !== '')
          ? item.product.sku
          : (item.sku && item.sku !== '')
          ? item.sku
          : `BH-${productId.toString().slice(-6).toUpperCase()}`;

      const productName =
        item.product?.name ?? item.productName ?? 'Unknown Product';
      const productImage =
        item.product?.image ?? item.productImage ?? null;

      return {
        product: new Types.ObjectId(productId),
        productName,
        productImage,
        sku,
        quantity: item.quantity,
        unitPrice: item.lockedPrice,
        unitDiscountPrice: item.lockedDiscountPrice ?? null,
        itemTotal: item.itemTotal,
      };
    });

    // ─── Shipping Address ─────────────────────────────────────
    const addr = dto.shippingAddress;
    if (!addr) {
      throw new Error('Shipping address is required');
    }
    order.shippingAddress = {
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      governorate: addr.governorate,
      postalCode: addr.postalCode ?? null,
      country: addr.country ?? 'Egypt',
    };

    // ─── Pricing ──────────────────────────────────────────────
    order.subtotal = cartSummary.subtotal ?? 0;
    order.shippingFee = calculateShippingFee(
      order.subtotal,
      addr.governorate,
    );
    order.tax = calculateTax(order.subtotal);
    order.discount = cartSummary.couponSaving ?? 0;
    order.couponCode = cartSummary.couponCode ?? null;
    order.total =
      order.subtotal + order.shippingFee + order.tax - order.discount;

    // ─── Payment ──────────────────────────────────────────────
    order.paymentMethod = dto.paymentMethod as PaymentMethod;
    order.paymentStatus = PaymentStatus.PENDING;
    order.paymentTransactionId = null;
    order.paidAt = null;

    // ─── Status ───────────────────────────────────────────────
    order.status = OrderStatus.PENDING;
    order.statusHistory = [
      {
        status: OrderStatus.PENDING,
        changedAt: new Date(),
        note: 'Order placed',
        changedBy: null,
      },
    ];

    // ─── Defaults ─────────────────────────────────────────────
    order.invoiceUrl = null;
    order.invoiceSent = false;
    order.cancelReason = null;
    order.canceledBy = null;
    order.canceledAt = null;
    order.confirmedAt = null;
    order.shippedAt = null;
    order.deliveredAt = null;
    order.notes = dto.notes ?? null;

    return order;
  }
}