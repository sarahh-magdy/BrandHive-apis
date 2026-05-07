import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Product } from './product.schema';
import { SortBy } from '../../modules/search/dto/search.dto';

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

  // ════════════════════════════════════════════════════════════════
  // ADVANCED SEARCH WITH FILTERS + SORTING
  // ════════════════════════════════════════════════════════════════
  async findWithFilters(
    filter: QueryFilter<Product>,
    options: {
      skip: number;
      limit: number;
      sort: Record<string, any>;
    },
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

  // ════════════════════════════════════════════════════════════════
  // FACETS — for sidebar filters
  // ════════════════════════════════════════════════════════════════
  async getFacets(baseFilter: QueryFilter<Product>) {
    const [priceRange, brands, ratings] = await Promise.all([
      // ─── Price range ────────────────────────────────────────
      this.productModel.aggregate([
        { $match: baseFilter as unknown as Record<string, any> },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
          },
        },
      ]),

      // ─── Brand distribution ──────────────────────────────────
      this.productModel.aggregate([
        { $match: baseFilter as unknown as Record<string, any> },
        {
          $group: {
            _id: '$brand',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'brands',
            localField: '_id',
            foreignField: '_id',
            as: 'brandInfo',
          },
        },
        { $unwind: '$brandInfo' },
        {
          $project: {
            _id: 1,
            name: '$brandInfo.name',
            slug: '$brandInfo.slug',
            count: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),

      // ─── Rating distribution ─────────────────────────────────
      this.productModel.aggregate([
        { $match: baseFilter as unknown as Record<string, any> },
        {
          $group: {
            _id: { $floor: '$stats.averageRating' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    return {
      priceRange: priceRange[0] ?? { minPrice: 0, maxPrice: 0 },
      brands,
      ratings: ratings.map((r: any) => ({
        rating: r._id,
        count: r.count,
      })),
    };
  }

  // ─── Low stock products ────────────────────────────────────────
  async getLowStockProducts(threshold: number) {
    return this.productModel
      .find({
        isDeleted: false,
        isActive: true,
        stock: { $gt: 0, $lte: threshold },
      })
      .populate('brand', 'name')
      .populate('category', 'name')
      .select('name sku stock images brand category')
      .lean()
      .exec();
  }

  // ─── Out of stock products ─────────────────────────────────────
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