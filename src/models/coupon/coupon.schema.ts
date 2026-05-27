import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  // ─── Code ──────────────────────────────────────────────────────
  @Prop({ type: String, required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, default: null })
  description: string | null;

  // ─── Type & Value ──────────────────────────────────────────────
  @Prop({ type: String, enum: CouponType, required: true })
  type: CouponType;

  // percentage → 0-100 | fixed → amount in EGP
  @Prop({ type: Number, required: true, min: 0 })
  value: number;

  // ─── Maximum discount cap (for percentage type) ────────────────
  @Prop({ type: Number, default: null })
  maxDiscountAmount: number | null;

  // ─── Minimum order amount ──────────────────────────────────────
  @Prop({ type: Number, default: 0, min: 0 })
  minOrderAmount: number;

  // ─── Usage Limits ──────────────────────────────────────────────
  // Total times this coupon can be used across all users
  @Prop({ type: Number, default: null })
  totalUsageLimit: number | null;

  // Times this coupon has been used so far
  @Prop({ type: Number, default: 0 })
  totalUsedCount: number;

  // Max times a single user can use this coupon
  @Prop({ type: Number, default: 1 })
  maxUsagePerUser: number;

  // ─── Expiry ────────────────────────────────────────────────────
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  // ─── Active / Inactive ─────────────────────────────────────────
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  // ─── Per-user usage tracking ───────────────────────────────────
  @Prop({
    type: [
      {
        user: { type: Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
      },
    ],
    default: [],
    select: false,
  })
  userUsage: { user: Types.ObjectId; count: number }[];
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ isActive: 1, expiresAt: 1 });