import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Review } from './review.schema';

@Injectable()
export class ReviewRepository extends AbstractRepository<Review> {
  constructor(@InjectModel(Review.name) private readonly reviewModel: Model<Review>) {
    super(reviewModel);
  }

  async findWithPaginationPopulated(
    filter: QueryFilter<Review>,
    options: { skip: number; limit: number },
  ) {
    return this.reviewModel
      .find(filter)
      .populate('user', 'userName')
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async getProductRatingStats(productId: string) {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          product: new Types.ObjectId(productId),
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    return result[0] ?? { averageRating: 0, totalReviews: 0 };
  }
}