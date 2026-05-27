import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from '../../models/order/order.schema';
import { Cart } from '../../models/cart/cart.schema';
import { Product } from '../../models/product/product.schema';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly api =
    process.env.RECOMMENDATION_API ||
    'https://recommendation-api-production-e25a.up.railway.app';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async getRecommendations(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // ─── 1. ابني الـ interactions من Orders + Cart ─────────────────
    const interactions = await this.buildInteractions(userObjectId);

    // ─── 2. لو مفيش interactions خالص ─────────────────────────────
    if (!interactions.length) {
      this.logger.log(`No interactions found for user ${userId}`);
      return [];
    }

    // ─── 3. ابعت للـ AI ────────────────────────────────────────────
    const recommendedIds = await this.getBehavioralRecommendations(interactions);

    if (!recommendedIds.length) return [];

    // ─── 4. جيب المنتجات من MongoDB ───────────────────────────────
    return this.productModel
      .find({
        _id: { $in: recommendedIds },
        isDeleted: false,
        isActive: true,
      })
      .populate('category')
      .populate('brand')
      .limit(20);
  }

  // ─── Build interactions من Orders + Cart ──────────────────────────
  private async buildInteractions(userId: Types.ObjectId) {
    const interactions: { product_id: string; event: string }[] = [];

    // Orders → transaction
    const orders = await this.orderModel
      .find({
        user: userId,
        status: {
          $in: [
            OrderStatus.DELIVERED,
            OrderStatus.CONFIRMED,
            OrderStatus.SHIPPED,
          ],
        },
      })
      .select('items.product')
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        interactions.push({
          product_id: item.product.toString(),
          event: 'transaction',
        });
      }
    }

    // Cart → addtocart
    const cart = await this.cartModel
      .findOne({ user: userId })
      .select('items.product')
      .lean();

    if (cart) {
      for (const item of cart.items) {
        interactions.push({
          product_id: item.product.toString(),
          event: 'addtocart',
        });
      }
    }

    return interactions;
  }

  // ─── Behavioral Recommendations ───────────────────────────────────
  private async getBehavioralRecommendations(
    interactions: { product_id: string; event: string }[],
  ): Promise<string[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<any>(
          `${this.api}/api/behavioral/recommend`,
          { interactions, top_n: 12 },
        ),
      );

      this.logger.log('AI response:', JSON.stringify(data));

      return (
        data?.recommendations?.map((r: any) => r.product_id?.toString()) || []
      );
    } catch (error) {
      this.logger.error(
        'Behavioral recommendation failed',
        error?.response?.data || error.message,
      );
      throw new HttpException(
        'Recommendation service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}