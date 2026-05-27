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
  private readonly api = process.env.RECOMMENDATION_API || 'https://recommendation-api-production-e25a.up.railway.app';

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  async getRecommendations(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    // ─── 1. جيب الـ interactions من الـ Orders والـ Cart ──────────
    const interactions = await this.buildInteractions(userObjectId);

    // ─── 2. جيب الـ categories المفضلة من الـ Orders ─────────────
    const categories = await this.buildPreferredCategories(userObjectId);

    // ─── 3. Behavioral Recommendations ───────────────────────────
    const behavioralProducts = await this.getBehavioralRecommendations(interactions);

    // ─── 4. Category-based Recommendations ───────────────────────
    const categoryProducts = categories.length
      ? await this.getCategoryRecommendations(categories)
      : [];

    // ─── 5. دمج النتائج وإزالة التكرار ───────────────────────────
    const mergedIds = this.mergeAndDeduplicate(behavioralProducts, categoryProducts);

    if (!mergedIds.length) return [];

    // ─── 6. جيب بيانات المنتجات من MongoDB ───────────────────────
    return this.productModel
      .find({ _id: { $in: mergedIds }, isDeleted: false, isActive: true })
      .populate('category')
      .populate('brand')
      .limit(20);
  }

  // ─── Build interactions من Orders + Cart ──────────────────────────
  private async buildInteractions(userId: Types.ObjectId) {
    const interactions: { product_id: string; event: string }[] = [];

    // من الـ Orders المكتملة → transaction
    const orders = await this.orderModel.find({
      user: userId,
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.CONFIRMED, OrderStatus.SHIPPED] },
    }).select('items').lean();

    for (const order of orders) {
      for (const item of order.items) {
        interactions.push({
          product_id: item.product.toString(),
          event: 'transaction',
        });
      }
    }

    // من الـ Cart الحالي → addtocart
    const cart = await this.cartModel.findOne({ user: userId }).select('items').lean();
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

  // ─── Build preferred categories من الـ Orders ─────────────────────
  private async buildPreferredCategories(userId: Types.ObjectId): Promise<string[]> {
    const orders = await this.orderModel.find({ user: userId })
      .select('items.product')
      .lean();

    const productIds = orders.flatMap(o => o.items.map(i => i.product));
    if (!productIds.length) return [];

    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .select('category')
      .populate('category', 'name')
      .lean();

    const categoryNames = products
      .map((p: any) => p.category?.name)
      .filter(Boolean);

    // إزالة التكرار
    return [...new Set(categoryNames)];
  }

  // ─── Behavioral Recommendations ───────────────────────────────────
  private async getBehavioralRecommendations(interactions: any[]): Promise<string[]> {
    if (!interactions.length) return [];
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<any>(`${this.api}/behavioral/recommend`, {
          interactions,
          top_n: 12,
        }),
      );
      return data?.recommendations?.map((r: any) => r.product_id?.toString()) || [];
    } catch (error) {
      this.logger.warn('Behavioral recommendation failed', error.message);
      return [];
    }
  }

  // ─── Category-based Recommendations ──────────────────────────────
  private async getCategoryRecommendations(categories: string[]): Promise<string[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<any>(`${this.api}/recommend`, {
          categories,
          top_n: 12,
        }),
      );
      return data?.products?.map((p: any) => p.product_id?.toString()) || [];
    } catch (error) {
      this.logger.warn('Category recommendation failed', error.message);
      return [];
    }
  }

  // ─── Merge وإزالة التكرار ─────────────────────────────────────────
  private mergeAndDeduplicate(behavioral: string[], category: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const id of [...behavioral, ...category]) {
      if (id && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
    return result;
  }
}