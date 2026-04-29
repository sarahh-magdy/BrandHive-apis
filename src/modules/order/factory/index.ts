import { Types } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order/order.schema';

export function buildOrderFromCart(params: any) {
  const { userId, orderNumber, cartItems, shippingAddress, pricing, paymentMethod, coupon, notes, changedBy } = params;

  const items = cartItems.map((item: any) => ({
    productId: item.product,
    sellerId: item.sellerId, // تأكدي إن الـ Cart Item فيها sellerId
    name: item.name,
    image: item.image || '',
    quantity: item.quantity,
    unitPrice: item.lockedDiscountPrice ?? item.lockedPrice,
    totalPrice: (item.lockedDiscountPrice ?? item.lockedPrice) * item.quantity,
  }));

  const total = pricing.subtotal + pricing.shippingFee + pricing.tax - pricing.discount;

  return {
    userId,
    orderNumber,
    items,
    shippingAddress: {
      ...shippingAddress,
      country: shippingAddress.country || 'Egypt',
      postalCode: shippingAddress.postalCode || '',
    },
    pricing: {
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      discount: pricing.discount,
      tax: pricing.tax,
      total: Math.max(0, parseFloat(total.toFixed(2))),
    },
    coupon: coupon || null,
    paymentMethod,
    paymentStatus: PaymentStatus.PENDING,
    status: OrderStatus.PENDING,
    statusHistory: [
      {
        status: OrderStatus.PENDING,
        changedAt: new Date(),
        note: 'تم إنشاء الطلب بنجاح',
        changedBy: changedBy || userId,
      },
    ],
    notes,
  };
}

export function buildStatusHistoryEntry(status: OrderStatus, note?: string, changedBy?: Types.ObjectId) {
  return {
    status,
    changedAt: new Date(),
    note: note || `حالة الطلب تغيرت إلى ${status}`,
    changedBy,
  };
}