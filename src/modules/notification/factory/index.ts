import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationEntity, NotificationTypeEnum } from '../entities/notification.entity';

export interface BuildNotificationInput {
  user: string;
  // ─── FIXED: بدلنا NotificationType بـ string عشان نقدر نبعت
  // القيم من أي مكان من غير ما نـ import الـ enum في كل service
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationFactoryService {
  build(input: BuildNotificationInput): Omit<NotificationEntity, '_id'> {
    return {
      user: new Types.ObjectId(input.user),
      // ─── FIXED: cast to enum ────────────────────────────────
      type: (input.type as NotificationTypeEnum) ?? NotificationTypeEnum.GENERAL,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      isRead: false,
      readAt: null,
    };
  }
}