import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CouponEntity } from '../entities/coupon.entity';
import { CreateCouponDto } from '../dto/coupon.dto';
import { CouponType } from '../../../models/coupon/coupon.schema';

@Injectable()
export class CouponFactoryService {
  build(dto: CreateCouponDto): CouponEntity {
    const coupon = new CouponEntity();
    (coupon as any)._id = new Types.ObjectId();
    coupon.code = dto.code.toUpperCase().trim();
    coupon.description = dto.description ?? null;
    coupon.type = dto.type;
    coupon.value = dto.value;
    coupon.maxDiscountAmount = dto.maxDiscountAmount ?? null;
    coupon.minOrderAmount = dto.minOrderAmount ?? 0;
    coupon.totalUsageLimit = dto.totalUsageLimit ?? null;
    coupon.totalUsedCount = 0;
    coupon.maxUsagePerUser = dto.maxUsagePerUser ?? 1;
    coupon.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    coupon.isActive = dto.isActive ?? true;
    return coupon;
  }

  // ─── Calculate discount amount ────────────────────────────────
  calculateDiscount(coupon: any, orderAmount: number): number {
    let discount = 0;

    if (coupon.type === CouponType.PERCENTAGE) {
      discount = Math.round((orderAmount * coupon.value) / 100);
      // Apply max discount cap if set
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // FIXED
      discount = coupon.value;
    }

    // Discount can't exceed order amount
    return Math.min(discount, orderAmount);
  }
}