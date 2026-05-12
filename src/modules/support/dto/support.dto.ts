import { Type } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { SupportStatus } from '../../../models/support-message/support-message.schema';

// ─── Send Message (public) ────────────────────────────────────────
export class SendSupportMessageDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(60)
    fullName: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(20, { message: 'Message must be at least 20 characters' })
    @MaxLength(2000)
    message: string;
}

// ─── Admin Reply ──────────────────────────────────────────────────
export class AdminReplyDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(2000)
    reply: string;
}

// ─── Admin Get All ────────────────────────────────────────────────
export class GetSupportMessagesDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;

    @IsOptional()
    @IsEnum(SupportStatus)
    status?: SupportStatus;

    @IsOptional()
    @IsString()
    search?: string;
}

// ─── Admin Update Status ──────────────────────────────────────────
export class UpdateSupportStatusDto {
    @IsEnum(SupportStatus)
    status: SupportStatus;
}