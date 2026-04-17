import {
  Model,
  QueryFilter,
  ProjectionType,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

export abstract class AbstractRepository<T = any> {
  constructor(protected readonly model: Model<T>) {}

  // Create
  public async create(item: Partial<T>): Promise<any> {
    return this.model.create(item);
  }

  // Get one
  public async getOne(
    filter: QueryFilter<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>,
  ): Promise<any> {
    return this.model.findOne(filter, projection, options).exec();
  }

  // Update one
  public async updateOne(
    filter: QueryFilter<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<any> {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    }).exec();
  }

  // Get all
  public async getAll(
    filter: QueryFilter<T> = {},
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>,
  ): Promise<any> {
    return this.model.find(filter, projection, options).exec();
  }

  // Update
  public async update(
    filter: QueryFilter<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>,
  ): Promise<any> {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    }).exec();
  }

  // Delete
  public async delete(filter: QueryFilter<T>): Promise<any> {
    return this.model.findOneAndDelete(filter).exec();
  }

  // Count
  public async countDocuments(filter: QueryFilter<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  // Pagination
  public async findWithPagination(
    filter: QueryFilter<T>,
    options: { skip: number; limit: number },
  ): Promise<any[]> {
    return this.model
      .find(filter)
      .skip(options.skip)
      .limit(options.limit)
      .exec();
  }
}