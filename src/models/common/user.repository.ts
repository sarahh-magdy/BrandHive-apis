import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findOne(
    filter: QueryFilter<UserDocument>,
    select?: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).select(select || '').exec();
  }

  async findById(id: string, select?: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select(select || '').exec();
  }

  async findByEmail(
    email: string,
    select?: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select(select || '')
      .exec();
  }

  async updateById(
    id: string,
    update: UpdateQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
  }

  async updateOne(
    filter: QueryFilter<UserDocument>,
    update: UpdateQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(filter, update, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }

  async findAll(filter: QueryFilter<UserDocument> = {}): Promise<UserDocument[]> {
    return this.userModel.find(filter).exec();
  }
}