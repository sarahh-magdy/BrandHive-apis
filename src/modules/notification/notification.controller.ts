import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { GetNotificationsDto } from './dto/get-notification.dto';
import {
  NotificationEntity,
  PaginatedNotificationsEntity,
} from './entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ── User endpoints ──────────────────────────────────────────

  /**
   * GET /notifications
   * Get current user's notifications (paginated, optional unreadOnly)
   */
  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, type: PaginatedNotificationsEntity })
  async getMyNotifications(@Req() req: any, @Query() dto: GetNotificationsDto) {
    return this.notificationService.getUserNotifications(req.user._id, dto);
  }

  /**
   * GET /notifications/unread-count
   * Unread badge count — called on every page load
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count (navbar badge)' })
  async getUnreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.user._id);
  }

  /**
   * PATCH /notifications/read-all
   * Mark all as read in one shot
   */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    await this.notificationService.markAllAsRead(req.user._id);
    return { success: true };
  }

  /**
   * PATCH /notifications/:id/read
   * Mark single notification as read
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    await this.notificationService.markAsRead(id, req.user._id);
    return { success: true };
  }

  /**
   * DELETE /notifications/:id
   * Soft delete a notification
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id' })
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    await this.notificationService.deleteNotification(id, req.user._id);
    return { success: true };
  }

  // ── Admin endpoints ─────────────────────────────────────────

  /**
   * DELETE /notifications/admin/cleanup
   * Admin: purge notifications older than N days
   */
  @Delete('admin/cleanup')
  @ApiOperation({ summary: '[Admin] Delete notifications older than 90 days' })
  async cleanup() {
    return this.notificationService.cleanupOldNotifications(90);
  }
}