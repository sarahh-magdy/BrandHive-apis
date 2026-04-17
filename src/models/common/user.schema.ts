import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CUSTOMER = 'customer',
  SELLER = 'seller',
  ADMIN = 'admin',
}

@Schema({ timestamps: true, discriminatorKey: 'role' })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  otp: string;

  @Prop({ select: false })
  otpExpires: Date;

  @Prop({ select: false })
  resetPasswordOtp: string;

  @Prop({ select: false })
  resetPasswordOtpExpires: Date;

  @Prop({ select: false })
  resetPasswordVerified: boolean;

  @Prop({ default: 0, select: false })
  otpAttempts: number;

  @Prop({ select: false })
  otpLockUntil: Date;

  @Prop()
  phone: string;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ select: false })
  refreshToken: string;
}

export const UserSchema = SchemaFactory.createForClass(User);