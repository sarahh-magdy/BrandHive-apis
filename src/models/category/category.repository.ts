import { Injectable } from '@nestjs/common';
import { Category } from './category.schema';
import { AbstractRepository } from '../abstract.repository';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';

@Injectable()
export class CategoryRepository extends AbstractRepository<Category> {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
  ) {
    super(categoryModel);
  }

 async getAllLean(
  filter: QueryFilter<Category>,
  options: { skip?: number; limit?: number; sort?: any },
): Promise<Partial<Category>[]> {
  return this.categoryModel
    .find(filter)
    .skip(options.skip || 0)
    .limit(options.limit || 10)
    .sort(options.sort || { createdAt: -1 })
    .lean()
    .exec();
}

  async count(filter: QueryFilter<Category>): Promise<number> {
    return this.categoryModel.countDocuments(filter).exec();
  }
}