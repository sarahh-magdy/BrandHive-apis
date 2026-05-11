import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum NotificationType {
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELED = 'order_canceled',
  PRICE_DROP = 'price_drop',
  STOCK_ALERT = 'stock_alert',
  // ─── ADDED ────────────────────────────────────────────────────
  BAZAAR_UPDATE = 'bazaar_update',
  BAZAAR_NEW = 'bazaar_new',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, default: NotificationType.GENERAL })
  type: NotificationType;

  @Prop({ type: String, required: true }) title: string;
  @Prop({ type: String, required: true }) body: string;
  @Prop({ type: Object, default: null }) data: Record<string, any> | null;
  @Prop({ type: Boolean, default: false }) isRead: boolean;
  @Prop({ type: Date, default: null }) readAt: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1 });