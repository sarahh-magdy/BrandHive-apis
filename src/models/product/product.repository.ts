import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Product } from './product.schema';

@Injectable()
export class ProductRepository extends AbstractRepository<Product> {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {
    super(productModel);
  }

  // ─── Base populated fetch ──────────────────────────────────────
  async findWithPagination(
    filter: QueryFilter<Product>,
    options: { skip: number; limit: number; sort?: Record<string, any> },
  ) {
    return this.productModel
      .find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort(options.sort ?? { createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async findOnePopulated(filter: QueryFilter<Product>) {
    return this.productModel
      .findOne(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean()
      .exec();
  }

  // ─── Advanced search with filters + sorting ───────────────────
  async findWithFilters(
    filter: QueryFilter<Product>,
    options: { skip: number; limit: number; sort: Record<string, any> },
  ) {
    return this.productModel
      .find(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async getAll(
    filter: QueryFilter<Product>,
    projection?: any,
    options?: any,
  ) {
    return this.productModel
      .find(filter, options?.projection ?? projection)
      .lean()
      .exec();
  }

  // ─── Seller-specific methods ───────────────────────────────────
  async findSellerProducts(
    sellerId: string,
    filter: QueryFilter<Product>,
    options: { skip: number; limit: number },
  ) {
    return this.productModel
      .find({ seller: new Types.ObjectId(sellerId), ...filter })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async countSellerProducts(sellerId: string, filter: QueryFilter<Product> = {}) {
    return this.productModel.countDocuments({
      seller: new Types.ObjectId(sellerId),
      ...filter,
    });
  }

  async findSellerProduct(sellerId: string, productId: string) {
    return this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        seller: new Types.ObjectId(sellerId),
        isDeleted: false,
      })
      .lean()
      .exec();
  }

  // ─── Home page feeds ──────────────────────────────────────────

  async getNewArrivals(days = 14, limit = 20) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.productModel
      .find({ isDeleted: false, isActive: true, createdAt: { $gte: since } })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getTopRated(limit = 20) {
    return this.productModel
      .find({
        isDeleted: false,
        isActive: true,
        'stats.totalReviews': { $gt: 0 },
      })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ 'stats.averageRating': -1, 'stats.totalReviews': -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getTrending(limit = 20) {
    return this.productModel
      .find({ isDeleted: false, isActive: true })
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .sort({ viewCount: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async incrementViewCount(productId: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { viewCount: 1 } },
      { new: true },
    );
  }

  async incrementCartCount(productId: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { cartCount: 1 } },
      { new: true },
    );
  }

  async decrementCartCount(productId: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { cartCount: -1 } },
      { new: true },
    );
  }

  async incrementWishlistCount(productId: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { wishlistCount: 1 } },
      { new: true },
    );
  }

  async decrementWishlistCount(productId: string) {
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { wishlistCount: -1 } },
      { new: true },
    );
  }

  // ─── Facets ───────────────────────────────────────────────────
  async getFacets(baseFilter: QueryFilter<Product>) {
    const matchFilter = baseFilter as unknown as Record<string, any>;

    const [priceRange, brands, ratings] = await Promise.all([
      this.productModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } },
      ]),
      this.productModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'brands',
            localField: '_id',
            foreignField: '_id',
            as: 'brandInfo',
          },
        },
        { $unwind: '$brandInfo' },
        { $project: { _id: 1, name: '$brandInfo.name', slug: '$brandInfo.slug', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      this.productModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $floor: '$stats.averageRating' }, count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    return {
      priceRange: priceRange[0] ?? { minPrice: 0, maxPrice: 0 },
      brands,
      ratings: ratings.map((r: any) => ({ rating: r._id, count: r.count })),
    };
  }

  // ─── Low stock ────────────────────────────────────────────────
  async getLowStockProducts(threshold: number) {
    return this.productModel
      .find({ isDeleted: false, isActive: true, stock: { $gt: 0, $lte: threshold } })
      .populate('brand', 'name')
      .populate('category', 'name')
      .select('name sku stock images brand category')
      .lean()
      .exec();
  }

  // ─── Out of stock ─────────────────────────────────────────────
  async getOutOfStockProducts(options: { skip: number; limit: number }) {
    return this.productModel
      .find({ isDeleted: false, isActive: true, stock: 0 })
      .populate('brand', 'name')
      .populate('category', 'name')
      .select('name sku stock images brand category')
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }
}