import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { CouponFactoryService } from './factory';
import { CouponRepository } from '../../models/coupon/coupon.repository';
import { Coupon, CouponSchema } from '../../models/coupon/coupon.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
    ]),
  ],
  controllers: [CouponController],
  providers: [CouponService, CouponFactoryService, CouponRepository],
  exports: [CouponService],
})
export class CouponModule {}