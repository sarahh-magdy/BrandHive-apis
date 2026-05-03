import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Coupon } from './coupon.schema';

@Injectable()
export class CouponRepository extends AbstractRepository<Coupon> {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
  ) {
    super(couponModel);
  }

  // ─── Get coupon with userUsage included ───────────────────────
  async findByCodeWithUsage(code: string) {
    return this.couponModel
      .findOne({ code: code.toUpperCase() })
      .select('+userUsage')
      .lean()
      .exec();
  }

  // ─── Increment total usage + per-user usage atomically ────────
  async incrementUsage(couponId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // Try to increment existing user entry
    const updated = await this.couponModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(couponId),
        'userUsage.user': userObjectId,
      },
      {
        $inc: {
          totalUsedCount: 1,
          'userUsage.$.count': 1,
        },
      },
      { new: true },
    );

    // If user not in array yet → push new entry
    if (!updated) {
      await this.couponModel.findOneAndUpdate(
        { _id: new Types.ObjectId(couponId) },
        {
          $inc: { totalUsedCount: 1 },
          $push: { userUsage: { user: userObjectId, count: 1 } },
        },
        { new: true },
      );
    }
  }

  // ─── Decrement usage (when order canceled) ────────────────────
  async decrementUsage(couponId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.couponModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(couponId),
        'userUsage.user': userObjectId,
      },
      {
        $inc: {
          totalUsedCount: -1,
          'userUsage.$.count': -1,
        },
      },
      { new: true },
    );
  }

  async findWithPagination(
    filter: QueryFilter<Coupon>,
    options: { skip: number; limit: number },
  ) {
    return this.couponModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }
}