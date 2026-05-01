import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderEntity, OrderItemEntity, ShippingAddressEntity, StatusHistoryEntity } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order/order.schema';
import { generateOrderNumber, calculateShippingFee, calculateTax } 
from '../../../common/helpers/shipping.helper';
@Injectable()
export class OrderFactoryService {
  buildOrder(dto: CreateOrderDto, userId: string, cartSummary: any): OrderEntity {
    const order = new OrderEntity();
    (order as any)._id = new Types.ObjectId();
    order.orderNumber = generateOrderNumber();
    order.user = new Types.ObjectId(userId);

    // ─── Items from cart (prices already locked) ──────────────
    order.items = (cartSummary.items ?? []).map((item: any): OrderItemEntity => ({
      product: new Types.ObjectId(item.product.id),
      productName: item.product.name,
      productImage: item.product.image ?? null,
      sku: item.product.sku ?? '',
      quantity: item.quantity,
      unitPrice: item.lockedPrice,
      unitDiscountPrice: item.lockedDiscountPrice ?? null,
      itemTotal: item.itemTotal,
    }));

    // ─── Shipping Address ─────────────────────────────────────
    order.shippingAddress = {
      fullName: dto.shippingAddress.fullName,
      phone: dto.shippingAddress.phone,
      street: dto.shippingAddress.street,
      city: dto.shippingAddress.city,
      governorate: dto.shippingAddress.governorate,
      postalCode: dto.shippingAddress.postalCode ?? null,
      country: dto.shippingAddress.country ?? 'Egypt',
    };

    // ─── Pricing ──────────────────────────────────────────────
    order.subtotal = cartSummary.subtotal ?? 0;
    order.shippingFee = calculateShippingFee(order.subtotal, dto.shippingAddress.governorate);
    order.tax = calculateTax(order.subtotal);
    order.discount = cartSummary.couponSaving ?? 0;
    order.couponCode = cartSummary.couponCode ?? null;
    order.total = order.subtotal + order.shippingFee + order.tax - order.discount;

    // ─── Payment ──────────────────────────────────────────────
    order.paymentMethod = dto.paymentMethod as PaymentMethod;
    order.paymentStatus = PaymentStatus.PENDING;
    order.paymentTransactionId = null;
    order.paidAt = null;

    // ─── Status ───────────────────────────────────────────────
    order.status = OrderStatus.PENDING;
    order.statusHistory = [{
      status: OrderStatus.PENDING,
      changedAt: new Date(),
      note: 'Order placed',
      changedBy: null,
    }];

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