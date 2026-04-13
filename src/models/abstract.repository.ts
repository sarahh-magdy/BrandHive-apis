import { Model, QueryFilter, ProjectionType, QueryOptions, UpdateQuery } from "mongoose";

export class AbstractRepository<T> {
  constructor(private readonly model: Model<T>) {}

  public async create(item: Partial<T>) {
    const doc = new this.model(item);
    return doc.save();
  }

  public async getOne(
    filter: QueryFilter<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>
  ) {
    return this.model.findOne(filter, projection, options).exec();
  }

  public async updateOne(
    filter: QueryFilter<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>
  ) {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    }).exec();
  }

  public async getAll(
    filter: QueryFilter<T> = {},
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>
  ) {
    return this.model.find(filter, projection, options).exec();
  }

  public async update(
    filter: QueryFilter<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions<T>
  ) {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      ...options,
    }).exec();
  }

  public async delete(filter: QueryFilter<T>) {
    return this.model.findOneAndDelete(filter).exec();
  }
}