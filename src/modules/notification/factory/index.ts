import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationEntity, NotificationTypeEnum } from '../entities/notification.entity';

export interface BuildNotificationInput {
  user: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationFactoryService {
  build(input: BuildNotificationInput): Omit<NotificationEntity, '_id'> | null {
    // ─── Guard: لو الـ user مش valid ObjectId → return null ───
    if (!Types.ObjectId.isValid(input.user)) {
      return null;
    }

    return {
      user: new Types.ObjectId(input.user),
      type: (input.type as NotificationTypeEnum) ?? NotificationTypeEnum.GENERAL,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      isRead: false,
      readAt: null,
    };
  }
}