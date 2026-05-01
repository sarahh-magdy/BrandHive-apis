import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum PaymentMethod {
  COD = 'cod',
  PAYMOB = 'paymob',
  FAWRY = 'fawry',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, default: null })
  productImage: string | null;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;

  @Prop({ type: Number, default: null })
  unitDiscountPrice: number | null;

  @Prop({ type: Number, required: true })
  itemTotal: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ type: String, required: true }) fullName: string;
  @Prop({ type: String, required: true }) phone: string;
  @Prop({ type: String, required: true }) street: string;
  @Prop({ type: String, required: true }) city: string;
  @Prop({ type: String, required: true }) governorate: string;
  @Prop({ type: String, default: null }) postalCode: string | null;
  @Prop({ type: String, default: 'Egypt' }) country: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ _id: false })
export class StatusHistory {
  @Prop({ type: String, enum: OrderStatus, required: true }) status: OrderStatus;
  @Prop({ type: Date, default: () => new Date() }) changedAt: Date;
  @Prop({ type: String, default: null }) note: string | null;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null }) changedBy: Types.ObjectId | null;
}

export const StatusHistorySchema = SchemaFactory.createForClass(StatusHistory);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  orderNumber: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: [StatusHistorySchema], default: [] })
  statusHistory: StatusHistory[];

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: Number, required: true, min: 0 }) subtotal: number;
  @Prop({ type: Number, default: 0, min: 0 }) shippingFee: number;
  @Prop({ type: Number, default: 0, min: 0 }) tax: number;
  @Prop({ type: Number, default: 0, min: 0 }) discount: number;
  @Prop({ type: String, default: null }) couponCode: string | null;
  @Prop({ type: Number, required: true, min: 0 }) total: number;

  @Prop({ type: String, enum: PaymentMethod, required: true }) paymentMethod: PaymentMethod;
  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Prop({ type: String, default: null }) paymentTransactionId: string | null;
  @Prop({ type: Date, default: null }) paidAt: Date | null;

  @Prop({ type: String, default: null }) invoiceUrl: string | null;
  @Prop({ type: Boolean, default: false }) invoiceSent: boolean;

  @Prop({ type: String, default: null }) cancelReason: string | null;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null }) canceledBy: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) canceledAt: Date | null;

  @Prop({ type: Date, default: null }) confirmedAt: Date | null;
  @Prop({ type: Date, default: null }) shippedAt: Date | null;
  @Prop({ type: Date, default: null }) deliveredAt: Date | null;
  @Prop({ type: String, default: null }) notes: string | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ 'items.product': 1 });