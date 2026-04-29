import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationRepository } from '../../models/notification/notification.repository';
import {
  NotificationDocument,
  NotificationChannel,
  NotificationType,
} from '../../models/notification/notification.schema';
import { GetNotificationsDto } from './dto/get-notification.dto';

// ─── Payload interfaces for each event type ──────────────────────────────────

export interface OrderPlacedPayload {
  userId: string;
  orderId: string;
  orderNumber: string;
  total: number;
}

export interface OrderStatusPayload {
  userId: string;
  orderId: string;
  orderNumber: string;
  status: 'confirmed' | 'shipped' | 'delivered' | 'canceled';
}

export interface PriceDropPayload {
  userIds: string[];
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
}

export interface BackInStockPayload {
  userIds: string[];
  productId: string;
  productName: string;
}

export interface LowStockPayload {
  adminUserIds: string[]; // notify admins/sellers
  productId: string;
  productName: string;
  stock: number;
}

export interface ReviewReplyPayload {
  userId: string;
  productId: string;
  productName: string;
  reviewId: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, { title: string; body: (num: string) => string }> = {
  confirmed: {
    title: '✅ Order Confirmed',
    body: (num) => `Your order ${num} has been confirmed and is being prepared.`,
  },
  shipped: {
    title: '🚚 Order Shipped',
    body: (num) => `Your order ${num} is on its way! Track it in your orders page.`,
  },
  delivered: {
    title: '📦 Order Delivered',
    body: (num) => `Your order ${num} has been delivered. Enjoy your purchase!`,
  },
  canceled: {
    title: '❌ Order Canceled',
    body: (num) => `Your order ${num} has been canceled.`,
  },
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // GET NOTIFICATIONS (paginated)
  // ─────────────────────────────────────────────────────────────

  async getUserNotifications(userId: string, dto: GetNotificationsDto) {
    const { data, total, unreadCount } =
      await this.notificationRepository.findByUser(userId, {
        page: dto.page!,
        limit: dto.limit!,
        unreadOnly: dto.unreadOnly,
      });

    return {
      data,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit!),
      unreadCount,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // UNREAD COUNT  (for navbar badge)
  // ─────────────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.getUnreadCount(userId);
    return { count };
  }

  // ─────────────────────────────────────────────────────────────
  // MARK AS READ
  // ─────────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────

  async deleteNotification(id: string, userId: string): Promise<void> {
    await this.notificationRepository.softDelete(id, userId);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — ORDER PLACED
  // ─────────────────────────────────────────────────────────────

  async notifyOrderPlaced(payload: OrderPlacedPayload): Promise<void> {
    await this.notificationRepository.create({
      userId: new Types.ObjectId(payload.userId),
      type: NotificationType.ORDER_PLACED,
      title: '🛒 Order Placed Successfully',
      body: `Your order ${payload.orderNumber} has been placed. Total: EGP ${payload.total}.`,
      meta: {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        actionUrl: `/orders/${payload.orderId}`,
      } as any,
      channel: NotificationChannel.IN_APP,
      isRead: false,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — ORDER STATUS CHANGED
  // ─────────────────────────────────────────────────────────────

  async notifyOrderStatusChanged(payload: OrderStatusPayload): Promise<void> {
    const typeMap: Record<string, NotificationType> = {
      confirmed: NotificationType.ORDER_CONFIRMED,
      shipped:   NotificationType.ORDER_SHIPPED,
      delivered: NotificationType.ORDER_DELIVERED,
      canceled:  NotificationType.ORDER_CANCELED,
    };

    const msg = STATUS_MESSAGES[payload.status];
    if (!msg) return;

    await this.notificationRepository.create({
      userId: new Types.ObjectId(payload.userId),
      type: typeMap[payload.status],
      title: msg.title,
      body: msg.body(payload.orderNumber),
      meta: {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        actionUrl: `/orders/${payload.orderId}`,
      } as any,
      channel: NotificationChannel.IN_APP,
      isRead: false,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — PRICE DROP  (wishlist users)
  // ─────────────────────────────────────────────────────────────

  async notifyPriceDrop(payload: PriceDropPayload): Promise<void> {
    if (!payload.userIds.length) return;

    await this.notificationRepository.notifyUsersForPriceDrop(
      payload.userIds.map((id) => new Types.ObjectId(id)),
      payload.productId,
      payload.productName,
      payload.oldPrice,
      payload.newPrice,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — BACK IN STOCK
  // ─────────────────────────────────────────────────────────────

  async notifyBackInStock(payload: BackInStockPayload): Promise<void> {
    if (!payload.userIds.length) return;

    await this.notificationRepository.notifyBackInStock(
      payload.userIds.map((id) => new Types.ObjectId(id)),
      payload.productId,
      payload.productName,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — LOW STOCK  (internal — admins/sellers only)
  // ─────────────────────────────────────────────────────────────

  async notifyLowStock(payload: LowStockPayload): Promise<void> {
    if (!payload.adminUserIds.length) return;

    const notifications = payload.adminUserIds.map((userId) => ({
      userId: new Types.ObjectId(userId),
      type: NotificationType.LOW_STOCK,
      title: '⚠️ Low Stock Alert',
      body: `"${payload.productName}" is running low — only ${payload.stock} left.`,
      meta: {
        productId: payload.productId,
        productName: payload.productName,
        actionUrl: `/admin/products/${payload.productId}`,
      },
      channel: NotificationChannel.IN_APP,
      isRead: false,
    }));

    await this.notificationRepository.createMany(notifications as any);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT — REVIEW REPLY
  // ─────────────────────────────────────────────────────────────

  async notifyReviewReply(payload: ReviewReplyPayload): Promise<void> {
    await this.notificationRepository.create({
      userId: new Types.ObjectId(payload.userId),
      type: NotificationType.REVIEW_REPLY,
      title: '💬 Admin replied to your review',
      body: `A reply was added to your review on "${payload.productName}".`,
      meta: {
        productId: payload.productId,
        productName: payload.productName,
        actionUrl: `/products/${payload.productId}#review-${payload.reviewId}`,
      } as any,
      channel: NotificationChannel.IN_APP,
      isRead: false,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // GENERIC SEND (used by order.service via event bus pattern)
  // ─────────────────────────────────────────────────────────────

  async send(event: string, payload: any): Promise<void> {
    switch (event) {
      case 'order.placed':
        return this.notifyOrderPlaced(payload);
      case 'order.confirmed':
      case 'order.shipped':
      case 'order.delivered':
      case 'order.canceled':
        return this.notifyOrderStatusChanged({
          ...payload,
          status: event.split('.')[1] as any,
        });
      case 'price.drop':
        return this.notifyPriceDrop(payload);
      case 'back.in.stock':
        return this.notifyBackInStock(payload);
      case 'low.stock':
        return this.notifyLowStock(payload);
      case 'review.reply':
        return this.notifyReviewReply(payload);
      default:
        console.warn(`[NotificationService] Unknown event: ${event}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLEANUP (cron job — call from a scheduler)
  // ─────────────────────────────────────────────────────────────

  async cleanupOldNotifications(daysOld = 90): Promise<{ deleted: number }> {
    const deleted = await this.notificationRepository.deleteOldNotifications(daysOld);
    return { deleted };
  }
}