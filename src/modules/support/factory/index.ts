import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SupportStatus } from '../../../models/support-message/support-message.schema';
import { SupportEntity } from '../entities/support.entity';
import { SendSupportMessageDto } from '../dto/support.dto';

@Injectable()
export class SupportFactoryService {
    build(dto: SendSupportMessageDto, userId?: string): Omit<SupportEntity, '_id'> {
        return {
            fullName: dto.fullName,
            email: dto.email.toLowerCase().trim(),
            message: dto.message,
            status: SupportStatus.OPEN,
            user: userId ? new Types.ObjectId(userId) : null,
            adminReply: null,
            repliedAt: null,
            repliedBy: null,
        };
    }
}