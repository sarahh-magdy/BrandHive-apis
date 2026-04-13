import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Product } from './product.schema';

@Injectable()
export class ProductRepository extends AbstractRepository<Product> {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {
    super(productModel);
  }

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

  async countDocuments(filter: QueryFilter<Product>): Promise<number> {
    return this.productModel.countDocuments(filter).exec();
  }

  async findOnePopulated(filter: QueryFilter<Product>) {
    return this.productModel
      .findOne(filter)
      .populate('category', 'name slug')
      .populate('brand', 'name slug logo')
      .lean()
      .exec();
  }
}