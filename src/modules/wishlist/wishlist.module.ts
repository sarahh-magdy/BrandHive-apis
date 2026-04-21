import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistFactoryService } from './factory';
import { WishlistRepository } from '../../models/wishlist/wishlist.repository';
import { Wishlist, WishlistSchema } from '../../models/wishlist/wishlist.schema';

import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';

import { Cart, CartSchema } from '../../models/cart/cart.schema';
import { CartRepository } from '../../models/cart/cart.repository';
import { CartService } from '../cart/cart.service';
import { CartFactoryService } from '../cart/factory';

import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
  ],
  controllers: [WishlistController],
  providers: [
    WishlistService,
    WishlistFactoryService,
    WishlistRepository,
    ProductRepository,
    CartService,
    CartFactoryService,
    CartRepository,
  ],
  exports: [WishlistService],
})
export class WishlistModule {}