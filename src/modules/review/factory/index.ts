import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ReviewEntity } from '../entities/review.entity';
import { CreateReviewDto } from '../dto/review.dto';

@Injectable()
export class ReviewFactoryService {
  build(dto: CreateReviewDto, userId: string): ReviewEntity {
    const review = new ReviewEntity();
    (review as any)._id = new Types.ObjectId();
    review.user = new Types.ObjectId(userId);
    review.product = new Types.ObjectId(dto.productId);
    review.order = new Types.ObjectId(dto.orderId);
    review.rating = dto.rating;
    review.comment = dto.comment;
    review.isVisible = true;
    return review;
  }
}