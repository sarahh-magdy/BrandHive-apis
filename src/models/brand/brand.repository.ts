import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
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
}