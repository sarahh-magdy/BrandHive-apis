import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export enum PaymentMethod {
  COD = 'cod',
  ONLINE = 'online',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sellerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  image: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  /** Price locked at order time — never changes even if product price changes */
  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  street: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  governorate: string;

  @Prop()
  postalCode: string;

  @Prop({ default: 'Egypt' })
  country: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ _id: false })
export class PriceSummary {
  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  shippingFee: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: 0, min: 0 })
  tax: number;

  @Prop({ required: true, min: 0 })
  total: number;
}

export const PriceSummarySchema = SchemaFactory.createForClass(PriceSummary);

@Schema({ _id: false })
export class CouponSnapshot {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  discountAmount: number;

  @Prop({ enum: ['percentage', 'fixed'], required: true })
  type: string;

  @Prop()
  value: number;
}

export const CouponSnapshotSchema = SchemaFactory.createForClass(CouponSnapshot);

@Schema({ _id: false })
export class StatusHistoryEntry {
  @Prop({ enum: OrderStatus, required: true })
  status: OrderStatus;

  @Prop({ default: () => new Date() })
  changedAt: Date;

  @Prop()
  note: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy: Types.ObjectId;
}

export const StatusHistoryEntrySchema = SchemaFactory.createForClass(StatusHistoryEntry);

@Schema({ _id: false })
export class InvoiceInfo {
  @Prop()
  invoiceNumber: string;

  @Prop()
  generatedAt: Date;

  @Prop()
  pdfUrl: string;
}

export const InvoiceInfoSchema = SchemaFactory.createForClass(InvoiceInfo);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Human-readable order number e.g. ORD-20240115-0001 */
  @Prop({ unique: true, required: true })
  orderNumber: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ type: PriceSummarySchema, required: true })
  pricing: PriceSummary;

  @Prop({ type: CouponSnapshotSchema, default: null })
  coupon: CouponSnapshot | null;

  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING, index: true })
  status: OrderStatus;

  @Prop({ enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  /** For online payment — store gateway transaction ref */
  @Prop()
  paymentTransactionId: string;

  /** For retry payment — store payment URL */
  @Prop()
  paymentUrl: string;

  @Prop({ type: [StatusHistoryEntrySchema], default: [] })
  statusHistory: StatusHistoryEntry[];

  @Prop({ type: InvoiceInfoSchema, default: null })
  invoice: InvoiceInfo | null;

  @Prop()
  notes: string;

  @Prop({ default: false })
  isDeleted: boolean;

  // Virtual
  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// ── Indexes ──────────────────────────────────────────────────────────────────
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'items.sellerId': 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 }, { unique: true });