import { Types } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order/order.schema';

export class OrderItemEntity {
  product: Types.ObjectId;
  productName: string;
  productImage: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitDiscountPrice: number | null;
  itemTotal: number;
}

export class ShippingAddressEntity {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  postalCode: string | null;
  country: string;
}

export class StatusHistoryEntity {
  status: OrderStatus;
  changedAt: Date;
  note: string | null;
  changedBy: Types.ObjectId | null;
}

export class OrderEntity {
  readonly _id: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  items: OrderItemEntity[];
  shippingAddress: ShippingAddressEntity;
  statusHistory: StatusHistoryEntity[];
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  couponCode: string | null;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId: string | null;
  paidAt: Date | null;
  invoiceUrl: string | null;
  invoiceSent: boolean;
  cancelReason: string | null;
  canceledBy: Types.ObjectId | null;
  canceledAt: Date | null;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  notes: string | null;
}