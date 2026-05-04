import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistFactoryService } from './factory';
import { WishlistRepository } from '../../models/wishlist/wishlist.repository';
import { Wishlist, WishlistSchema } from '../../models/wishlist/wishlist.schema';

import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';

import { UserMongoModule } from '../../shared/modules/user-mongo.module';

import { CartModule } from '@modules/cart/cart.module';
import { CouponModule } from '@modules/coupon/coupon.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,

    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Product.name, schema: ProductSchema },
    ]),

    forwardRef(() => CartModule),
    CouponModule,
  ],

  controllers: [WishlistController],

  providers: [
    WishlistService,
    WishlistFactoryService,
    WishlistRepository,
    ProductRepository,
  ],

  exports: [WishlistService],
})
export class WishlistModule { }