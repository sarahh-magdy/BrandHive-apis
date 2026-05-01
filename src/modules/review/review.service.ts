import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ReviewRepository } from '../../models/review/review.repository';
import { ProductRepository } from '../../models/product/product.repository';
import { OrderRepository } from '../../models/order/order.repository';
import { ReviewFactoryService } from './factory';
import { CreateReviewDto, GetReviewsDto } from './dto/review.dto';
import { OrderStatus } from '../../models/order/order.schema';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly productRepository: ProductRepository,
    private readonly orderRepository: OrderRepository,
    private readonly reviewFactory: ReviewFactoryService,
  ) {}

  // ════════════════════════════════════════════════════════════════
  // CREATE REVIEW — Verified Purchase Only
  // ════════════════════════════════════════════════════════════════
  async createReview(userId: string, dto: CreateReviewDto) {
    // ─── Product must exist ───────────────────────────────────
    const product = await this.productRepository.getOne({
      _id: new Types.ObjectId(dto.productId),
      isDeleted: false,
    });
    if (!product) throw new NotFoundException('Product not found');

    // ─── Verified Purchase: order must be delivered & contain product
    const order = await this.orderRepository.getOne({
      _id: new Types.ObjectId(dto.orderId),
      user: new Types.ObjectId(userId),
      status: OrderStatus.DELIVERED,
      'items.product': new Types.ObjectId(dto.productId),
    });
    if (!order) {
      throw new ForbiddenException(
        'You can only review products from your delivered orders',
      );
    }

    // ─── Prevent duplicate review ─────────────────────────────
    const existing = await this.reviewRepository.getOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(dto.productId),
      order: new Types.ObjectId(dto.orderId),
    });
    if (existing) throw new ConflictException('You already reviewed this product');

    // ─── Build & save ─────────────────────────────────────────
    const entity = this.reviewFactory.build(dto, userId);
    const review = await this.reviewRepository.create({ ...entity });

    // ─── Recalculate product stats ────────────────────────────
    await this.recalculateStats(dto.productId);

    return { message: 'Review submitted successfully', data: review };
  }

  // ════════════════════════════════════════════════════════════════
  // GET PRODUCT REVIEWS
  // ════════════════════════════════════════════════════════════════
  async getProductReviews(productId: string, query: GetReviewsDto) {
    const { page = 1, limit = 10, rating } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      product: new Types.ObjectId(productId),
      isVisible: true,
    };
    if (rating) filter.rating = rating;

    const [data, total, stats] = await Promise.all([
      this.reviewRepository.findWithPaginationPopulated(filter, { skip, limit }),
      this.reviewRepository.countDocuments(filter),
      this.reviewRepository.getProductRatingStats(productId),
    ]);

    return {
      data,
      stats: {
        averageRating: Math.round((stats.averageRating ?? 0) * 10) / 10,
        totalReviews: stats.totalReviews ?? 0,
      },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // GET MY REVIEWS
  // ════════════════════════════════════════════════════════════════
  async getMyReviews(userId: string, query: GetReviewsDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.reviewRepository.findWithPaginationPopulated(filter, { skip, limit }),
      this.reviewRepository.countDocuments(filter),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ════════════════════════════════════════════════════════════════
  // DELETE REVIEW (owner or Admin)
  // ════════════════════════════════════════════════════════════════
  async deleteReview(reviewId: string, userId: string, role: string) {
    const filter: Record<string, any> = { _id: new Types.ObjectId(reviewId) };
    if (role !== 'Admin') filter.user = new Types.ObjectId(userId);

    const review = await this.reviewRepository.getOne(filter);
    if (!review) throw new NotFoundException('Review not found');

    const productId = (review as any).product.toString();
    await this.reviewRepository.delete({ _id: new Types.ObjectId(reviewId) });
    await this.recalculateStats(productId);

    return { message: 'Review deleted successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // TOGGLE VISIBILITY (Admin)
  // ════════════════════════════════════════════════════════════════
  async toggleVisibility(reviewId: string) {
    const review = await this.reviewRepository.getOne({
      _id: new Types.ObjectId(reviewId),
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.reviewRepository.updateOne(
      { _id: new Types.ObjectId(reviewId) },
      { isVisible: !(review as any).isVisible },
      { new: true },
    );

    await this.recalculateStats((review as any).product.toString());

    return { message: 'Review visibility updated', data: updated };
  }

  // ─── Recalculate Product Rating Stats ─────────────────────────
  private async recalculateStats(productId: string) {
    const stats = await this.reviewRepository.getProductRatingStats(productId);
    await this.productRepository.updateOne(
      { _id: new Types.ObjectId(productId) },
      {
        'stats.averageRating': Math.round((stats.averageRating ?? 0) * 10) / 10,
        'stats.totalReviews': stats.totalReviews ?? 0,
      },
      { new: true },
    );
  }
}