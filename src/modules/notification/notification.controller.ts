import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
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
import { CreateNotificationDto } from './dto/create-notification.dto';
@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['Customer', 'Seller', 'Admin'])
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }
  @Post('send')
  @Auth(['Admin'])
  sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.sendNotification(dto);
  }
  @Get()
  getNotifications(@User() user: any, @Query() query: GetNotificationsDto) {
    return this.notificationService.getUserNotifications(user._id, query);
  }

  @Get('unread-count')
  getUnreadCount(@User() user: any) {
    return this.notificationService.getUnreadCount(user._id);
  }

  @Patch('read-all')
  markAllAsRead(@User() user: any) {
    return this.notificationService.markAllAsRead(user._id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @User() user: any) {
    return this.notificationService.markAsRead(id, user._id);
  }

  @Delete(':id')
  deleteNotification(@Param('id') id: string, @User() user: any) {
    return this.notificationService.deleteNotification(id, user._id);
  }
}