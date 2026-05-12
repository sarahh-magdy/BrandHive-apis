import { Types } from 'mongoose';
import { SupportStatus } from '../../../models/support-message/support-message.schema';

export class SupportEntity {
    readonly _id: Types.ObjectId;
    fullName: string;
    email: string;
    message: string;
    status: SupportStatus;
    user: Types.ObjectId | null;
    adminReply: string | null;
    repliedAt: Date | null;
    repliedBy: Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}