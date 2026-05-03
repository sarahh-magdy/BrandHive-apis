import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: true, trim: true })
  phone: string;

  @Prop({ type: String, required: true, trim: true })
  street: string;

  @Prop({ type: String, required: true, trim: true })
  city: string;

  @Prop({ type: String, required: true, trim: true })
  governorate: string;

  @Prop({ type: String, default: null })
  postalCode: string | null;

  @Prop({ type: String, default: 'Egypt', trim: true })
  country: string;

  // ─── Default address flag ──────────────────────────────────────
  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  // ─── Label (Home, Work, Other) ─────────────────────────────────
  @Prop({ type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' })
  label: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

AddressSchema.index({ user: 1 });
AddressSchema.index({ user: 1, isDefault: 1 });