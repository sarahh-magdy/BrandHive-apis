import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '../../../models/notification/notification.schema';

export class NotificationMetaEntity {
  @ApiPropertyOptional() orderId?: string;
  @ApiPropertyOptional() orderNumber?: string;
  @ApiPropertyOptional() productId?: string;
  @ApiPropertyOptional() productName?: string;
  @ApiPropertyOptional() oldPrice?: number;
  @ApiPropertyOptional() newPrice?: number;
  @ApiPropertyOptional() actionUrl?: string;
}

export class NotificationEntity {
  @ApiProperty() _id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() body: string;
  @ApiPropertyOptional({ type: NotificationMetaEntity }) meta?: NotificationMetaEntity;
  @ApiProperty() isRead: boolean;
  @ApiPropertyOptional() readAt?: Date;
  @ApiProperty({ enum: NotificationChannel }) channel: NotificationChannel;
  @ApiProperty() createdAt: Date;
}

export class PaginatedNotificationsEntity {
  @ApiProperty({ type: [NotificationEntity] }) data: NotificationEntity[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() unreadCount: number;
}