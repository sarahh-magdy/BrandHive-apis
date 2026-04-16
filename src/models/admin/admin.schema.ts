import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
})
export class Admin {
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  userName: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, default: 'Admin' })
  role: string;

  @Prop({ type: String, default: null })
  otp: string;

  @Prop({ type: Date, default: null })
  otpExpiry: Date;

  @Prop({ type: Boolean, default: true })
  isVerified: boolean;
}
export const AdminSchema = SchemaFactory.createForClass(Admin);