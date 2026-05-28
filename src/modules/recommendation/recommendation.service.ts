import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../../models/product/product.schema';
import { Order, OrderStatus } from '../../models/order/order.schema';
import { Cart } from '../../models/cart/cart.schema';
import { Wishlist } from '../../models/wishlist/wishlist.schema';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    @InjectModel(Wishlist.name) private readonly wishlistModel: Model<Wishlist>,
  ) {}

  // ─── Personal Recommendations ──────────────────────────────────────
  async getRecommendations(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const { categoryIds, brandIds, interactedProductIds } =
      await this.getUserPreferences(userObjectId);

    if (!categoryIds.length) {
      return this.getTrending([], 12);
    }

    const products = await this.productModel
      .find({
        _id: { $nin: interactedProductIds },
        isDeleted: false,
        isActive: true,
        $or: [
          { category: { $in: categoryIds } },
          { brand: { $in: brandIds } },
        ],
      })
      .populate('category', 'name')
      .populate('brand', 'name logo')
      .sort({ 'stats.averageRating': -1, viewCount: -1 })
      .limit(20);

    if (products.length < 6) {
      const trending = await this.getTrending(interactedProductIds, 12 - products.length);
      return [...products, ...trending];
    }

    return products;
  }

  // ─── Similar Products ──────────────────────────────────────────────
  async getSimilarProducts(productId: string) {
    // ─── DEBUG ────────────────────────────────────────────────────
    this.logger.log(`Looking for productId: ${productId}`);

    const count = await this.productModel.countDocuments({ isDeleted: false, isActive: true });
    this.logger.log(`Total active products: ${count}`);

    // جيب 3 products عشان نشوف شكل الـ IDs
    const samples = await this.productModel.find({}).limit(3).lean();
    this.logger.log(`Sample IDs: ${samples.map(p => p._id.toString()).join(', ')}`);

    // جرب findOne بـ string
    const byString = await this.productModel.findOne({ _id: productId }).lean();
    this.logger.log(`findOne by string: ${byString?.name}`);

    // جرب findOne بـ ObjectId
let byObjectId: any = null;
try {
  byObjectId = await this.productModel.findOne({
        _id: new Types.ObjectId(productId),
      }).lean();
    } catch (e) {
      this.logger.error(`ObjectId conversion error: ${e.message}`);
    }
    this.logger.log(`findOne by ObjectId: ${byObjectId?.name}`);

    // ─── END DEBUG ────────────────────────────────────────────────

    const product = byObjectId || byString;
    if (!product) {
      this.logger.warn(`Product ${productId} not found`);
      return [];
    }

    this.logger.log(`Product found: ${product.name}, category: ${product.category}`);

    // أول محاولة: نفس الـ category
    let products = await this.productModel
      .find({
        _id: { $ne: new Types.ObjectId(productId) },
        isDeleted: false,
        isActive: true,
        category: product.category,
      })
      .populate('category', 'name')
      .populate('brand', 'name logo')
      .sort({ 'stats.averageRating': -1, viewCount: -1 })
      .limit(8);

    this.logger.log(`Same category products found: ${products.length}`);

    // لو النتايج أقل من 4، وسّع البحث
    if (products.length < 4) {
      products = await this.productModel
        .find({
          _id: { $ne: new Types.ObjectId(productId) },
          isDeleted: false,
          isActive: true,
          $or: [
            { category: product.category },
            { brand: product.brand },
            ...(product.tags?.length
              ? [{ tags: { $in: product.tags } }]
              : []),
          ],
        })
        .populate('category', 'name')
        .populate('brand', 'name logo')
        .sort({ 'stats.averageRating': -1, viewCount: -1 })
        .limit(8);

      this.logger.log(`Expanded search products found: ${products.length}`);
    }

    return products;
  }

  // ─── Trending Products ─────────────────────────────────────────────
  async getTrending(excludeIds: Types.ObjectId[], limit = 12) {
    return this.productModel
      .find({
        _id: { $nin: excludeIds },
        isDeleted: false,
        isActive: true,
      })
      .populate('category', 'name')
      .populate('brand', 'name logo')
      .sort({ viewCount: -1, cartCount: -1, wishlistCount: -1 })
      .limit(limit);
  }

  // ─── User Preferences من Orders + Cart + Wishlist ──────────────────
  private async getUserPreferences(userId: Types.ObjectId) {
    const categoryIds = new Set<string>();
    const brandIds = new Set<string>();
    const interactedProductIds: Types.ObjectId[] = [];

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
      .populate('items.product', 'category brand')
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        const p = item.product as any;
        if (!p?._id) continue;
        interactedProductIds.push(p._id);
        if (p.category) categoryIds.add(p.category.toString());
        if (p.brand) brandIds.add(p.brand.toString());
      }
    }

    const cart = await this.cartModel
      .findOne({ user: userId })
      .select('items.product')
      .populate('items.product', 'category brand')
      .lean();

    if (cart) {
      for (const item of cart.items) {
        const p = item.product as any;
        if (!p?._id) continue;
        interactedProductIds.push(p._id);
        if (p.category) categoryIds.add(p.category.toString());
        if (p.brand) brandIds.add(p.brand.toString());
      }
    }

    const wishlist = await this.wishlistModel
      .findOne({ user: userId })
      .select('items.product')
      .populate('items.product', 'category brand')
      .lean();

    if (wishlist) {
      for (const item of wishlist.items) {
        const p = item.product as any;
        if (!p?._id) continue;
        interactedProductIds.push(p._id);
        if (p.category) categoryIds.add(p.category.toString());
        if (p.brand) brandIds.add(p.brand.toString());
      }
    }

    return {
      categoryIds: [...categoryIds].map((id) => new Types.ObjectId(id)),
      brandIds: [...brandIds].map((id) => new Types.ObjectId(id)),
      interactedProductIds,
    };
  }
}