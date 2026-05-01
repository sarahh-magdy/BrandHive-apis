import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationType } from '../../../models/notification/notification.schema';

export interface BuildNotificationInput {
  user: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationFactoryService {
  build(input: BuildNotificationInput): Omit<NotificationEntity, '_id'> {
    return {
      user: new Types.ObjectId(input.user),
      type: input.type ?? NotificationType.GENERAL,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      isRead: false,
      readAt: null,
    };
  }
}