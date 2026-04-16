import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({
  timestamps: true,
  toJSON: { virtuals: true }
})
export class User {
  readonly _id: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: ['customer', 'seller', 'admin'],
    default: 'customer'
  })
  role: string;

  @Prop()
  otp: string;

  @Prop()
  otpExpiry: Date;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  dob: Date;

  @Prop()
  whatsappLink: string;
}

export const UserSchema = SchemaFactory.createForClass(User);