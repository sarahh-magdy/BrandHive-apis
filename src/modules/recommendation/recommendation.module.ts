import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { Product, ProductSchema } from '../../models/product/product.schema';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { Cart, CartSchema } from '../../models/cart/cart.schema';
import { Wishlist, WishlistSchema } from '../../models/wishlist/wishlist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Wishlist.name, schema: WishlistSchema },
    ]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
})
export class RecommendationModule {}