import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { Order, OrderSchema } from '../../models/order/order.schema';
import { Cart, CartSchema } from '../../models/cart/cart.schema';
import { Product, ProductSchema } from '../../models/product/product.schema';

@Module({
  imports: [
    HttpModule.register({ timeout: 10000 }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
})
export class RecommendationModule {}