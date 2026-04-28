import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  // Order events
  ORDER_PLACED = 'order.placed',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELED = 'order.canceled',

  // Product events
  PRICE_DROP = 'price.drop',
  BACK_IN_STOCK = 'back.in.stock',
  LOW_STOCK = 'low.stock',

  // Review
  REVIEW_REPLY = 'review.reply',

  // System
  SYSTEM = 'system',
  PROMOTION = 'promotion',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
}

@Schema({ _id: false })
class NotificationMeta {
  @Prop()
  orderId: string;

  @Prop()
  orderNumber: string;

  @Prop()
  productId: string;

  @Prop()
  productName: string;

  @Prop()
  oldPrice: number;

  @Prop()
  newPrice: number;

  @Prop()
  actionUrl: string;
}
const NotificationMetaSchema = SchemaFactory.createForClass(NotificationMeta);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: NotificationType, required: true, index: true })
  type: NotificationType;

  @Prop({ required: true, maxlength: 120 })
  title: string;

  @Prop({ required: true, maxlength: 500 })
  body: string;

  @Prop({ type: NotificationMetaSchema, default: null })
  meta: NotificationMeta | null;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt: Date;

  @Prop({ enum: NotificationChannel, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });