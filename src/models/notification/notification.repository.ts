import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: Partial<Notification>): Promise<NotificationDocument> {
    return new this.notificationModel(data).save();
  }

  async createMany(notifications: Partial<Notification>[]): Promise<void> {
    await this.notificationModel.insertMany(notifications);
  }

  async findByUser(
    userId: string,
    options: { page: number; limit: number; unreadOnly?: boolean },
  ): Promise<{ data: NotificationDocument[]; total: number; unreadCount: number }> {
    const baseQuery = { userId, isDeleted: false };
    const query = options.unreadOnly ? { ...baseQuery, isRead: false } : baseQuery;
    const skip = (options.page - 1) * options.limit;

    const [data, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(query),
      this.notificationModel.countDocuments({ userId, isDeleted: false, isRead: false }),
    ]);

    return { data: data as NotificationDocument[], total, unreadCount };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: id, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
      isDeleted: false,
    });
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne({ _id: id, userId }, { isDeleted: true });
  }

  async deleteOldNotifications(daysOld = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoff },
    });
    return result.deletedCount;
  }

  /** Used by price-drop: find users who wishlisted a product */
  async notifyUsersForPriceDrop(
    userIds: Types.ObjectId[],
    productId: string,
    productName: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.PRICE_DROP,
      title: 'Price Drop Alert! 🎉',
      body: `"${productName}" dropped from EGP ${oldPrice} to EGP ${newPrice}`,
      meta: {
        productId,
        productName,
        oldPrice,
        newPrice,
        actionUrl: `/products/${productId}`,
      },
      isRead: false,
    }));

    await this.notificationModel.insertMany(notifications);
  }

  /** Used by stock module: notify users when item is back in stock */
  async notifyBackInStock(
    userIds: Types.ObjectId[],
    productId: string,
    productName: string,
  ): Promise<void> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.BACK_IN_STOCK,
      title: 'Back in Stock! 📦',
      body: `"${productName}" is now available again`,
      meta: {
        productId,
        productName,
        actionUrl: `/products/${productId}`,
      },
      isRead: false,
    }));

    await this.notificationModel.insertMany(notifications);
  }
}