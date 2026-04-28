import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from '../../models/review/review.repository';

import { OrderModule } from '../order/order.module';
import { ProductModule } from '../product/product.module';

import { Review, ReviewSchema } from '../../models/review/review.schema';

@Module({
  imports: [
    OrderModule,
    ProductModule,

    // 🔥 ده أهم سطر
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    ReviewRepository,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}