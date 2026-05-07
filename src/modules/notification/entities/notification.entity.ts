import { Types } from 'mongoose';

export enum NotificationTypeEnum {
  ORDER_PLACED = 'order_placed',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELED = 'order_canceled',
  PRICE_DROP = 'price_drop',
  STOCK_ALERT = 'stock_alert',
  GENERAL = 'general',
}

export class NotificationEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationTypeEnum;
  title: string;
  body: string;
  data: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
}