import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Notification } from './notification.schema';

@Injectable()
export class NotificationRepository extends AbstractRepository<Notification> {
  constructor(
    @InjectModel(Notification.name) private readonly notifModel: Model<Notification>,
  ) {
    super(notifModel);
  }

  async findUserNotifications(
    userId: string,
    options: { skip: number; limit: number; unreadOnly?: boolean },
  ) {
    const filter: Record<string, any> = { user: userId };
    if (options.unreadOnly) filter.isRead = false;
    return this.notifModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifModel.countDocuments({ user: userId, isRead: false }).exec();
  }

  async markManyAsRead(userId: string): Promise<void> {
    await this.notifModel.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}