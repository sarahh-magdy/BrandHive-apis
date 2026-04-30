import { Types } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order/order.schema';

interface CartItem {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  name: string;
  image?: string;
  quantity: number;
  price: number; // price locked from cart
}

interface PricingInput {
  subtotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
}

interface CouponInput {
  code: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  value: number;
}

interface ShippingAddressInput {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  postalCode?: string;
  country?: string;
}

interface BuildOrderParams {
  userId: Types.ObjectId;
  orderNumber: string;
  cartItems: CartItem[];
  shippingAddress: ShippingAddressInput;
  pricing: PricingInput;
  paymentMethod: PaymentMethod;
  coupon?: CouponInput | null;
  notes?: string;
  changedBy?: Types.ObjectId;
}

export function buildOrderFromCart(params: BuildOrderParams) {
  const {
    userId,
    orderNumber,
    cartItems,
    shippingAddress,
    pricing,
    paymentMethod,
    coupon,
    notes,
    changedBy,
  } = params;

const items = cartItems.map((item) => ({
  productId: item.productId,
  sellerId: item.sellerId,
  name: item.name,
  image: item.image ?? '',   
  quantity: item.quantity,
  unitPrice: item.price,
  totalPrice: item.price * item.quantity,
}));

  const total = pricing.subtotal + pricing.shippingFee + pricing.tax - pricing.discount;

  return {
    userId,
    orderNumber,
    items,
    shippingAddress: {
      ...shippingAddress,
      country: shippingAddress.country ?? 'Egypt',
      postalCode: shippingAddress.postalCode ?? '',
    },
    pricing: {
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      discount: pricing.discount,
      tax: pricing.tax,
      total: Math.max(0, parseFloat(total.toFixed(2))),
    },
    coupon: coupon ?? null,
    paymentMethod,
    paymentStatus:
      paymentMethod === PaymentMethod.COD
        ? PaymentStatus.PENDING
        : PaymentStatus.PENDING,
    status: OrderStatus.PENDING,
statusHistory: [
  {
    status: OrderStatus.PENDING,
    changedAt: new Date(),
    note: 'Order placed',
    changedBy: changedBy ?? new Types.ObjectId('000000000000000000000000'),
  },
],
    notes,
  };
}

export function buildStatusHistoryEntry(
  status: OrderStatus,
  note?: string,
  changedBy: Types.ObjectId | null = null,
) {
  return { status, changedAt: new Date(), note, changedBy };
}