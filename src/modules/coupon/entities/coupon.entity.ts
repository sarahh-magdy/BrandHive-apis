import { Types } from 'mongoose';
import { CouponType } from '../../../models/coupon/coupon.schema';

export class CouponEntity {
  readonly _id: Types.ObjectId;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  totalUsageLimit: number | null;
  totalUsedCount: number;
  maxUsagePerUser: number;
  expiresAt: Date | null;
  isActive: boolean;
}