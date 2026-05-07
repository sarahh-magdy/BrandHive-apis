import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GetNotificationsDto } from './dto/get-notification.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['customer', 'seller', 'admin'])
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  // GET /notifications
  @Get()
  getNotifications(@User() user: any, @Query() query: GetNotificationsDto) {
    return this.notificationService.getUserNotifications(user._id, query);
  }

  // GET /notifications/unread-count
  @Get('unread-count')
  getUnreadCount(@User() user: any) {
    return this.notificationService.getUnreadCount(user._id);
  }

  // PATCH /notifications/read-all
  @Patch('read-all')
  markAllAsRead(@User() user: any) {
    return this.notificationService.markAllAsRead(user._id);
  }

  // PATCH /notifications/:id/read
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @User() user: any) {
    return this.notificationService.markAsRead(id, user._id);
  }

  // DELETE /notifications/:id
  @Delete(':id')
  deleteNotification(@Param('id') id: string, @User() user: any) {
    return this.notificationService.deleteNotification(id, user._id);
  }
}