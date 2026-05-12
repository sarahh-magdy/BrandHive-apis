import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export enum SupportStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

@Schema({ timestamps: true })
export class SupportMessage {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({ type: String, enum: SupportStatus, default: SupportStatus.OPEN })
  status: SupportStatus;

  // ─── If logged-in user sent the message ───────────────────────
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  user: Types.ObjectId | null;

  // ─── Admin reply ──────────────────────────────────────────────
  @Prop({ type: String, default: null })
  adminReply: string | null;

  @Prop({ type: Date, default: null })
  repliedAt: Date | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  repliedBy: Types.ObjectId | null;
}

export const SupportMessageSchema = SchemaFactory.createForClass(SupportMessage);

SupportMessageSchema.index({ status: 1, createdAt: -1 });
SupportMessageSchema.index({ email: 1 });