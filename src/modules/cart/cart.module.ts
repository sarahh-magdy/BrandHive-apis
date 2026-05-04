import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartFactoryService } from './factory';
import { CartRepository } from '../../models/cart/cart.repository';
import { Cart, CartSchema } from '../../models/cart/cart.schema';
import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    CouponModule,
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService, CartFactoryService, CartRepository, ProductRepository],
  exports: [CartService],
})
export class CartModule { }