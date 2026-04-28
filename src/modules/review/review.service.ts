import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewRepository } from '../../models/review/review.repository';
import { ReviewDocument } from '../../models/review/review.schema';
import {
  CreateReviewDto,
  AdminReplyDto,
  UpdateReviewDto,
} from './dto/create-review.dto';
import { GetReviewsDto, ReviewSortBy } from './dto/get-reviews.dto';
import { buildReview } from './factory';

/**
 * Replace with actual imports
 */
interface IOrderService {
  hasDeliveredOrderWithProduct(
    userId: string,
    productId: string,
  ): Promise<{ exists: boolean; orderId?: string }>;
}

interface IProductService {
  findById(productId: string): Promise<any>;
  updateRating(
    productId: string,
    avgRating: number,
    reviewCount: number,
  ): Promise<void>;
}

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly orderService: IOrderService,
    private readonly productService: IProductService,
  ) {}

  // ─────────────────────────────────────────
  // CREATE REVIEW
  // ─────────────────────────────────────────
  async createReview(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    const product = await this.productService.findById(dto.productId);
    if (!product) throw new NotFoundException('Product not found');

    const { exists, orderId } =
      await this.orderService.hasDeliveredOrderWithProduct(
        userId,
        dto.productId,
      );

    if (!exists) {
      throw new BadRequestException(
        'You can only review products you have purchased and received.',
      );
    }

    const existing = await this.reviewRepository.findByProductAndUser(
      dto.productId,
      userId,
    );

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this product.',
      );
    }

const reviewData = buildReview({
  productId: dto.productId,
  userId,
  rating: dto.rating,
  comment: dto.comment,
  title: dto.title,
  images: dto.images?.map(img => ({
    url: img.url,
    alt: img.alt ?? '',
  })),
});

    const review = await this.reviewRepository.create(reviewData);

    await this.syncProductRating(dto.productId);

    return review;
  }

  // ─────────────────────────────────────────
  // GET PRODUCT REVIEWS
  // ─────────────────────────────────────────
  async getProductReviews(productId: string, dto: GetReviewsDto) {
    const filters: Record<string, any> = {};

    if (dto.rating) filters.rating = dto.rating;
    if (dto.verifiedOnly) filters.isVerifiedPurchase = true;

    const sort = this.buildSort(dto.sortBy ?? ReviewSortBy.NEWEST);

    const [{ data, total }, stats] = await Promise.all([
      this.reviewRepository.findByProduct(productId, filters, {
        page: dto.page!,
        limit: dto.limit!,
        sort,
      }),
      this.reviewRepository.getRatingStats(productId),
    ]);

    return {
      data,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit!),
      stats,
    };
  }

  // ─────────────────────────────────────────
  // GET REVIEW BY ID
  // ─────────────────────────────────────────
  async getReviewById(id: string): Promise<ReviewDocument> {
    const review = await this.reviewRepository.findById(id);
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  // ─────────────────────────────────────────
  // GET MY REVIEWS
  // ─────────────────────────────────────────
  async getMyReviews(userId: string, dto: GetReviewsDto) {
    const { data, total } =
      await this.reviewRepository.findByUser(userId, {
        page: dto.page!,
        limit: dto.limit!,
      });

    return {
      data,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit!),
    };
  }

  // ─────────────────────────────────────────
  // UPDATE REVIEW
  // ─────────────────────────────────────────
  async updateReview(
    reviewId: string,
    userId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewDocument> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    if (String(review.userId) !== userId)
      throw new ForbiddenException('Access denied');

    const updated = await this.reviewRepository.update(reviewId, {
      ...(dto.rating !== undefined && { rating: dto.rating }),
      ...(dto.comment && { comment: dto.comment }),
      ...(dto.title && { title: dto.title }),
...(dto.images && {
  images: dto.images.map(img => ({
    url: img.url,
    alt: img.alt ?? '',
  })),
}),    });

    if (dto.rating !== undefined) {
      await this.syncProductRating(String(review.productId));
    }

    return updated!;
  }

  // ─────────────────────────────────────────
  // DELETE REVIEW
  // ─────────────────────────────────────────
  async deleteReview(
    reviewId: string,
    userId: string,
    isAdmin = false,
  ): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    if (!isAdmin && String(review.userId) !== userId)
      throw new ForbiddenException('Access denied');

    await this.reviewRepository.softDelete(reviewId);
    await this.syncProductRating(String(review.productId));
  }

  // ─────────────────────────────────────────
  // HELPFUL VOTE
  // ─────────────────────────────────────────
  async toggleHelpfulVote(
    reviewId: string,
    userId: string,
  ): Promise<{ helpful: boolean; count: number }> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    if (String(review.userId) === userId) {
      throw new BadRequestException(
        'Cannot vote on your own review',
      );
    }

    const hasVoted = review.helpfulVoters?.some(
      (id) => String(id) === userId,
    );

    let updated: ReviewDocument | null;

    if (hasVoted) {
      updated =
        await this.reviewRepository.removeHelpfulVote(
          reviewId,
          userId,
        );
    } else {
      updated =
        await this.reviewRepository.addHelpfulVote(
          reviewId,
          userId,
        );
    }

    return {
      helpful: !hasVoted,
      count: updated?.helpfulCount ?? 0,
    };
  }

  // ─────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────
  async getProductRatingStats(productId: string) {
    return this.reviewRepository.getRatingStats(productId);
  }

  // ─────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────
  async toggleVisibility(
    reviewId: string,
  ): Promise<ReviewDocument> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    return (
      await this.reviewRepository.update(reviewId, {
        isVisible: !review.isVisible,
      })
    )!;
  }

  async adminReply(
    reviewId: string,
    dto: AdminReplyDto,
  ): Promise<ReviewDocument> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) throw new NotFoundException('Review not found');

    return (
      await this.reviewRepository.update(reviewId, {
        adminReply: dto.reply,
        adminRepliedAt: new Date(),
      })
    )!;
  }

  async adminGetAllReviews(
    dto: GetReviewsDto & {
      productId?: string;
      userId?: string;
    },
  ) {
    const filters: Record<string, any> = {};

    if (dto.productId) filters.productId = dto.productId;
    if (dto.userId) filters.userId = dto.userId;
    if (dto.rating) filters.rating = dto.rating;
    if (dto.verifiedOnly)
      filters.isVerifiedPurchase = true;

    const { data, total } =
      await this.reviewRepository.findAll(filters, {
        page: dto.page!,
        limit: dto.limit!,
      });

    return {
      data,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit!),
    };
  }

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  private async syncProductRating(productId: string) {
    const stats =
      await this.reviewRepository.getRatingStats(productId);

    await this.productService.updateRating(
      productId,
      stats.averageRating,
      stats.totalReviews,
    );
  }

  private buildSort(
    sortBy: ReviewSortBy,
  ): Record<string, 1 | -1> {
    switch (sortBy) {
      case ReviewSortBy.NEWEST:
        return { createdAt: -1 };
      case ReviewSortBy.OLDEST:
        return { createdAt: 1 };
      case ReviewSortBy.HIGHEST_RATING:
        return { rating: -1 };
      case ReviewSortBy.LOWEST_RATING:
        return { rating: 1 };
      case ReviewSortBy.MOST_HELPFUL:
        return { helpfulCount: -1 };
      default:
        return { createdAt: -1 };
    }
  }
}