import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CouponRepository } from '../../models/coupon/coupon.repository';
import { CouponFactoryService } from './factory';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/coupon.dto';
import { GetOrdersDto } from '../order/dto/get-orders.dto';

@Injectable()
export class CouponService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly couponFactory: CouponFactoryService,
  ) { }

  // ════════════════════════════════════════════════════════════════
  // CREATE COUPON (Admin)
  // ════════════════════════════════════════════════════════════════
  async createCoupon(dto: CreateCouponDto) {
    // ─── Validate percentage value ────────────────────────────
    if (dto.type === 'percentage' && dto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    // ─── Check duplicate code ─────────────────────────────────
    const existing = await this.couponRepository.getOne({
      code: dto.code.toUpperCase().trim(),
    });
    if (existing) throw new ConflictException('Coupon code already exists');

    const entity = this.couponFactory.build(dto);
    const coupon = await this.couponRepository.create({ ...entity });

    return { message: 'Coupon created successfully', data: coupon };
  }

  // ════════════════════════════════════════════════════════════════
  // GET ALL COUPONS (Admin)
  // ════════════════════════════════════════════════════════════════
  async getAllCoupons(page = 1, limit = 10, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (isActive !== undefined) filter.isActive = isActive;

    const [data, total] = await Promise.all([
      this.couponRepository.findWithPagination(filter, { skip, limit }),
      this.couponRepository.countDocuments(filter),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ════════════════════════════════════════════════════════════════
  // GET ONE COUPON (Admin)
  // ════════════════════════════════════════════════════════════════
  async getOne(couponId: string) {
    const coupon = await this.couponRepository.getOne({
      _id: new Types.ObjectId(couponId),
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return { data: coupon };
  }

  // ════════════════════════════════════════════════════════════════
  // UPDATE COUPON (Admin)
  // ════════════════════════════════════════════════════════════════
  async updateCoupon(couponId: string, dto: UpdateCouponDto) {
    const coupon = await this.couponRepository.getOne({
      _id: new Types.ObjectId(couponId),
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (dto.type === 'percentage' && dto.value && dto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    // ─── If code changed, check uniqueness ────────────────────
    if (dto.code) {
      const existing = await this.couponRepository.getOne({
        code: dto.code.toUpperCase().trim(),
        _id: { $ne: new Types.ObjectId(couponId) },
      });
      if (existing) throw new ConflictException('Coupon code already exists');
    }

    const updated = await this.couponRepository.updateOne(
      { _id: new Types.ObjectId(couponId) },
      { ...dto, ...(dto.code && { code: dto.code.toUpperCase().trim() }) },
      { new: true },
    );

    return { message: 'Coupon updated successfully', data: updated };
  }

  // ════════════════════════════════════════════════════════════════
  // DELETE COUPON (Admin)
  // ════════════════════════════════════════════════════════════════
  async deleteCoupon(couponId: string) {
    const coupon = await this.couponRepository.getOne({
      _id: new Types.ObjectId(couponId),
    });
    if (!coupon) throw new NotFoundException('Coupon not found');

    await this.couponRepository.delete({ _id: new Types.ObjectId(couponId) });
    return { message: 'Coupon deleted successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // VALIDATE COUPON (Customer — preview before applying)
  // ════════════════════════════════════════════════════════════════
  async validateCoupon(dto: ValidateCouponDto, userId: string) {
    const coupon = await this.validateAndGetCoupon(dto.code, userId, dto.orderAmount);
    const discount = this.couponFactory.calculateDiscount(coupon, dto.orderAmount);

    return {
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        finalAmount: dto.orderAmount - discount,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // APPLY COUPON ON CART
  // ════════════════════════════════════════════════════════════════
  async applyCouponOnCart(
    couponCode: string,
    userId: string,
    cartSubtotal: number,
  ) {
    const coupon = await this.validateAndGetCoupon(couponCode, userId, cartSubtotal);
    const discount = this.couponFactory.calculateDiscount(coupon, cartSubtotal);

    return {
      couponId: (coupon as any)._id.toString(),
      couponCode: coupon.code,
      couponDiscount: discount,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // INTERNAL: Validate coupon fully (used by order + cart)
  // ════════════════════════════════════════════════════════════════
  async validateAndGetCoupon(code: string, userId: string, orderAmount: number) {
    const coupon = await this.couponRepository.findByCodeWithUsage(code);

    // ─── Existence ────────────────────────────────────────────
    if (!coupon) throw new NotFoundException('Invalid coupon code');

    // ─── Active ───────────────────────────────────────────────
    if (!coupon.isActive) {
      throw new BadRequestException('This coupon is no longer active');
    }

    // ─── Expiry ───────────────────────────────────────────────
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      throw new BadRequestException('This coupon has expired');
    }

    // ─── Total usage limit ────────────────────────────────────
    if (
      coupon.totalUsageLimit !== null &&
      coupon.totalUsedCount >= coupon.totalUsageLimit
    ) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // ─── Minimum order amount ─────────────────────────────────
    if (orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount for this coupon is EGP ${coupon.minOrderAmount}`,
      );
    }

    // ─── Per-user usage limit ─────────────────────────────────
    const userEntry = (coupon.userUsage ?? []).find(
      (u: any) => u.user.toString() === userId,
    );
    const userUsedCount = userEntry?.count ?? 0;

    if (userUsedCount >= coupon.maxUsagePerUser) {
      throw new BadRequestException(
        `You have already used this coupon ${coupon.maxUsagePerUser} time(s)`,
      );
    }

    return coupon;
  }

  // ─── Called after order placed ────────────────────────────────
  async incrementUsage(couponId: string, userId: string) {
    await this.couponRepository.incrementUsage(couponId, userId);
  }

  // ─── Called after order canceled ─────────────────────────────
  async decrementUsage(couponId: string, userId: string) {
    await this.couponRepository.decrementUsage(couponId, userId);
  }
}