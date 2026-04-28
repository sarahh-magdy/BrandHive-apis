import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Review, ReviewDocument } from './review.schema';

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

@Injectable()
export class ReviewRepository {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async create(data: Partial<Review>): Promise<ReviewDocument> {
    return new this.reviewModel(data).save();
  }

  async findById(id: string): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findOne({ _id: id, isDeleted: false })
      .populate('userId', 'name avatar')
      .exec();
  }

  async findByProductAndUser(
    productId: string,
    userId: string,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findOne({ productId, userId, isDeleted: false })
      .exec();
  }

  async findByProduct(
    productId: string,
    filters: QueryFilter<ReviewDocument> = {},
    options: { page: number; limit: number; sort?: Record<string, 1 | -1> },
  ): Promise<{ data: ReviewDocument[]; total: number }> {
    const query: QueryFilter<ReviewDocument> = {
      productId,
      isDeleted: false,
      isVisible: true,
      ...filters,
    };

    const sort = options.sort ?? { createdAt: -1 };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .populate('userId', 'name avatar')
        .lean()
        .exec(),
      this.reviewModel.countDocuments(query),
    ]);

    return { data: data as ReviewDocument[], total };
  }

  async findByUser(
    userId: string,
    options: { page: number; limit: number },
  ): Promise<{ data: ReviewDocument[]; total: number }> {
    const query = { userId, isDeleted: false };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .populate('productId', 'name images')
        .lean()
        .exec(),
      this.reviewModel.countDocuments(query),
    ]);

    return { data: data as ReviewDocument[], total };
  }

  async getRatingStats(productId: string): Promise<RatingStats> {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
          isDeleted: false,
          isVisible: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (!result.length) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const r = result[0];
    return {
      averageRating: parseFloat(r.averageRating.toFixed(1)),
      totalReviews: r.totalReviews,
      distribution: { 1: r.r1, 2: r.r2, 3: r.r3, 4: r.r4, 5: r.r5 },
    };
  }

  /** Recalculate and return avg rating for syncing to Product document */
  async getAverageRating(productId: string): Promise<number> {
    const stats = await this.getRatingStats(productId);
    return stats.averageRating;
  }

  async update(id: string, update: Partial<Review>): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
  }

  async addHelpfulVote(
    reviewId: string,
    userId: string,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        $addToSet: { helpfulVoters: new Types.ObjectId(userId) },
        $inc: { helpfulCount: 1 },
      },
      { new: true },
    );
  }

  async removeHelpfulVote(
    reviewId: string,
    userId: string,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        $pull: { helpfulVoters: new Types.ObjectId(userId) },
        $inc: { helpfulCount: -1 },
      },
      { new: true },
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.reviewModel.findByIdAndUpdate(id, { isDeleted: true });
  }

  async findAll(
    filters: QueryFilter<ReviewDocument> = {},
    options: { page: number; limit: number },
  ): Promise<{ data: ReviewDocument[]; total: number }> {
    const query = { isDeleted: false, ...filters };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .populate('userId', 'name email')
        .populate('productId', 'name')
        .lean()
        .exec(),
      this.reviewModel.countDocuments(query),
    ]);

    return { data: data as ReviewDocument[], total };
  }
}