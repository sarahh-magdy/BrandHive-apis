import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationRepository } from '../../models/notification/notification.repository';
import { NotificationFactoryService, BuildNotificationInput } from './factory';
import { GetNotificationsDto } from './dto/get-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationFactory: NotificationFactoryService,
  ) { }

  // ─── Create single (called internally) ───────────────────────
  async create(input: BuildNotificationInput) {
    const entity = this.notificationFactory.build(input);
    if (!entity) return null;
    return this.notificationRepository.create({ ...entity } as any);
  }

  // ─── ADDED: Create bulk — بتبعت لـ list من الـ users ──────────
  // بتستخدمها لما بتعمل bazaar جديد وعايز تبعت لكل الـ customers
  async createBulk(
    userIds: string[],
    input: Omit<BuildNotificationInput, 'user'>,
  ) {
    const validIds = userIds.filter((id) => Types.ObjectId.isValid(id));
    if (!validIds.length) return;

    const notifications = validIds.map((userId) => ({
      user: new Types.ObjectId(userId),
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
      isRead: false,
      readAt: null,
    }));

    // ─── insertMany أسرع من loop of create ────────────────────
    await this.notificationRepository['notifModel'].insertMany(notifications);
  }

  // ─── Get User Notifications ───────────────────────────────────
  async getUserNotifications(userId: string, query: GetNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const skip = (page - 1) * limit;

    const [data, total, unreadCount] = await Promise.all([
      this.notificationRepository.findUserNotifications(userId, {
        skip,
        limit,
        unreadOnly,
      }),
      this.notificationRepository.countDocuments({
        user: new Types.ObjectId(userId),
      }),
      this.notificationRepository.getUnreadCount(userId),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  // ─── Get Unread Count ─────────────────────────────────────────
  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.getUnreadCount(userId);
    return { data: { count } };
  }

  // ─── Mark Single As Read ──────────────────────────────────────
  async markAsRead(notificationId: string, userId: string) {
    await this.notificationRepository.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        user: new Types.ObjectId(userId),
      },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
    return { message: 'Notification marked as read' };
  }

  // ─── Mark All As Read ─────────────────────────────────────────
  async markAllAsRead(userId: string) {
    await this.notificationRepository.markManyAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  // ─── Delete Notification ──────────────────────────────────────
  async deleteNotification(notificationId: string, userId: string) {
    await this.notificationRepository.delete({
      _id: new Types.ObjectId(notificationId),
      user: new Types.ObjectId(userId),
    });
    return { message: 'Notification deleted' };
  }
}