import { Types } from 'mongoose';

import { NotificationType } from '../../../models/notification/notification.schema';

type: NotificationType.ORDER_PLACED

export class NotificationEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType; // بدل NotificationTypeEnum
  title: string;
  body: string;
  data: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
}