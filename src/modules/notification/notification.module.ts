import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationFactoryService } from './factory';
import { NotificationRepository } from '../../models/notification/notification.repository';
import {
  Notification,
  NotificationSchema,
} from '../../models/notification/notification.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationFactoryService,
    NotificationRepository,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}