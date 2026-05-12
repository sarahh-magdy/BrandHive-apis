import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Brand } from './brand.schema';

@Injectable()
export class BrandRepository extends AbstractRepository<Brand> {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
  ) {
    super(brandModel);
  }

  async findWithPagination(
    filter: QueryFilter<Brand>,
    options: { skip: number; limit: number },
  ) {
    return this.brandModel
      .find(filter)
      .populate('categories', 'name slug')
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async countDocuments(filter: QueryFilter<Brand>): Promise<number> {
    return this.brandModel.countDocuments(filter).exec();
  }

  async findByCategory(categoryId: Types.ObjectId, options: { skip: number; limit: number }) {
    return this.brandModel
      .find({ categories: categoryId, isDeleted: false, isActive: true })
      .populate('categories', 'name slug')
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async countByCategory(categoryId: Types.ObjectId): Promise<number> {
    return this.brandModel
      .countDocuments({ categories: categoryId, isDeleted: false, isActive: true })
      .exec();
  }

  // ─── ADDED: track brand page views ────────────────────────────
  async incrementViewCount(brandId: string) {
    return this.brandModel.findByIdAndUpdate(
      brandId,
      { $inc: { 'stats.viewCount': 1 } },
      { new: true },
    );
  }
  async findByFilter(filter: QueryFilter<Brand>): Promise<Brand[]> {
    return this.brandModel.find(filter).lean().exec();
  }
}