import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { SupportMessageRepository } from '../../models/support-message/support-message.repository';
import { SupportStatus } from '../../models/support-message/support-message.schema';
import { sendMail } from '../../common/helpers/send-mail.helper';
import {
    SendSupportMessageDto,
    AdminReplyDto,
    GetSupportMessagesDto,
    UpdateSupportStatusDto,
} from './dto/support.dto';

@Injectable()
export class SupportService {
    constructor(
        private readonly supportRepository: SupportMessageRepository,
        private readonly configService: ConfigService,
    ) { }

    // ════════════════════════════════════════════════════════════════
    // SEND MESSAGE (Public)
    // ════════════════════════════════════════════════════════════════
    async sendMessage(dto: SendSupportMessageDto, userId?: string) {
        const message = await this.supportRepository.create({
            fullName: dto.fullName,
            email: dto.email.toLowerCase().trim(),
            message: dto.message,
            status: SupportStatus.OPEN,
            user: userId ? new Types.ObjectId(userId) : null,
            adminReply: null,
            repliedAt: null,
            repliedBy: null,
        } as any);

        // ─── Auto-reply email to sender ───────────────────────────
        sendMail({
            to: dto.email,
            subject: 'We received your message - Brand Hive Support',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
          <h2 style="color:#333">Thank you for reaching out! 👋</h2>
          <p>Hi <b>${dto.fullName}</b>,</p>
          <p>We've received your message and our team will get back to you within <b>24 hours</b>.</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:6px;margin:16px 0">
            <p style="color:#666;margin:0"><b>Your message:</b></p>
            <p style="color:#444;margin:8px 0 0">${dto.message}</p>
          </div>
          <p style="color:#999;font-size:12px">Brand Hive Support Team</p>
        </div>
      `,
        });

        // ─── Notify admin ─────────────────────────────────────────
        const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
        if (adminEmail) {
            sendMail({
                to: adminEmail,
                subject: `[Support] New message from ${dto.fullName}`,
                html: `
          <div style="font-family:Arial,sans-serif;padding:24px">
            <h3>New Support Message</h3>
            <p><b>From:</b> ${dto.fullName} (${dto.email})</p>
            <p><b>Message:</b></p>
            <p>${dto.message}</p>
          </div>
        `,
            });
        }

        return {
            message: "Your message has been sent. We'll get back to you soon!",
            data: { id: (message as any)._id },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // GET ALL MESSAGES (Admin)
    // ════════════════════════════════════════════════════════════════
    async getAllMessages(query: GetSupportMessagesDto) {
        const { page = 1, limit = 10, status, search } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }

        const [data, total, openCount, inProgressCount, resolvedCount] = await Promise.all([
            this.supportRepository.findWithPagination(filter, { skip, limit }),
            this.supportRepository.countDocuments(filter),
            this.supportRepository.countDocuments({ status: SupportStatus.OPEN }),
            this.supportRepository.countDocuments({ status: SupportStatus.IN_PROGRESS }),
            this.supportRepository.countDocuments({ status: SupportStatus.RESOLVED }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                stats: {
                    open: openCount,
                    inProgress: inProgressCount,
                    resolved: resolvedCount,
                },
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // GET ONE MESSAGE (Admin)
    // ════════════════════════════════════════════════════════════════
    async getOne(messageId: string) {
        const message = await this.supportRepository.getOne({
            _id: new Types.ObjectId(messageId),
        });
        if (!message) throw new NotFoundException('Message not found');
        return { data: message };
    }

    // ════════════════════════════════════════════════════════════════
    // REPLY TO MESSAGE (Admin)
    // ════════════════════════════════════════════════════════════════
    async replyToMessage(messageId: string, dto: AdminReplyDto, adminId: string) {
        const message = await this.supportRepository.getOne({
            _id: new Types.ObjectId(messageId),
        });
        if (!message) throw new NotFoundException('Message not found');

        const updated = await this.supportRepository.updateOne(
            { _id: new Types.ObjectId(messageId) },
            {
                adminReply: dto.reply,
                repliedAt: new Date(),
                repliedBy: new Types.ObjectId(adminId),
                status: SupportStatus.RESOLVED,
            },
            { new: true },
        );

        // ─── Send reply email to user ─────────────────────────────
        sendMail({
            to: (message as any).email,
            subject: 'Reply from Brand Hive Support',
            html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px">
          <h2 style="color:#333">Reply from Brand Hive Support 💬</h2>
          <p>Hi <b>${(message as any).fullName}</b>,</p>
          <p>Here's our response to your message:</p>
          <div style="background:#f0f7ff;padding:16px;border-left:4px solid #3498db;border-radius:4px;margin:16px 0">
            <p style="margin:0;color:#2c3e50">${dto.reply}</p>
          </div>
          <p style="color:#888;font-size:13px">Your original message:</p>
          <div style="background:#f9f9f9;padding:12px;border-radius:4px">
            <p style="color:#666;font-size:13px;margin:0">${(message as any).message}</p>
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px">Brand Hive Support Team</p>
        </div>
      `,
        });

        return { message: 'Reply sent successfully', data: updated };
    }

    // ════════════════════════════════════════════════════════════════
    // UPDATE STATUS (Admin)
    // ════════════════════════════════════════════════════════════════
    async updateStatus(messageId: string, dto: UpdateSupportStatusDto) {
        const message = await this.supportRepository.getOne({
            _id: new Types.ObjectId(messageId),
        });
        if (!message) throw new NotFoundException('Message not found');

        const updated = await this.supportRepository.updateOne(
            { _id: new Types.ObjectId(messageId) },
            { status: dto.status },
            { new: true },
        );

        return { message: 'Status updated', data: updated };
    }

    // ════════════════════════════════════════════════════════════════
    // DELETE MESSAGE (Admin)
    // ════════════════════════════════════════════════════════════════
    async deleteMessage(messageId: string) {
        const message = await this.supportRepository.getOne({
            _id: new Types.ObjectId(messageId),
        });
        if (!message) throw new NotFoundException('Message not found');

        await this.supportRepository.delete({ _id: new Types.ObjectId(messageId) });
        return { message: 'Message deleted successfully' };
    }
}