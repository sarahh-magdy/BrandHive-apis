// dto/create-notification.dto.ts
import {
    IsEnum,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsObject,
} from 'class-validator';
import { NotificationTypeEnum } from '../entities/notification.entity';

export class CreateNotificationDto {
    @IsOptional()
    @IsMongoId()
    userId?: string; // لو مش موجود → هيبعت لكل الـ users

    @IsEnum(NotificationTypeEnum)
    type: NotificationTypeEnum;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, any>;
}