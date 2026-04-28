import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from '../../models/review/review.repository';

// استورد الموديولات اللي فيها الخدمات دي
import { OrderModule } from '../order/order.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    OrderModule,
    ProductModule,
  ],
  controllers: [ReviewController],
  providers: [
    ReviewService,
    ReviewRepository,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}