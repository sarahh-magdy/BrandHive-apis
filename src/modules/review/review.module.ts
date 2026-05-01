import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewFactoryService } from './factory';
import { ReviewRepository } from '../../models/review/review.repository';
import { Review, ReviewSchema } from '../../models/review/review.schema';

import { ProductRepository } from '../../models/product/product.repository';
import { Product, ProductSchema } from '../../models/product/product.schema';

import { OrderRepository } from '../../models/order/order.repository';
import { Order, OrderSchema } from '../../models/order/order.schema';

import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    ReviewFactoryService,
    ReviewRepository,
    ProductRepository,
    OrderRepository,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}