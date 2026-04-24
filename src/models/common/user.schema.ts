import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  // ❗ optional
  @Prop({ unique: true, lowercase: true, trim: true, sparse: true })
  email?: string;

  // ✅ new
  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop()
  government: string;

  @Prop({ select: false })
  otp: string;

  @Prop({ select: false })
  otpExpires: Date;

  @Prop({ default: 0, select: false })
  otpAttempts: number;

  @Prop({ select: false })
  otpLockUntil: Date;

  @Prop({ select: false })
  resetPasswordOtp: string;

  @Prop({ select: false })
  resetPasswordOtpExpires: Date;

  @Prop({ select: false })
  resetPasswordVerified: boolean;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ select: false })
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);