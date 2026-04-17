import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery, Types } from 'mongoose';
import { BrandRequest, BrandRequestDocument } from './brand-request.schema';

@Injectable()
export class BrandRequestRepository {
  constructor(
    @InjectModel(BrandRequest.name)
    private readonly model: Model<BrandRequestDocument>,
  ) {}

  // ─── CREATE ─────────────────────────────
  async create(data: Partial<BrandRequest>): Promise<BrandRequestDocument> {
    return this.model.create(data);
  }

  // ─── GET ONE (بديل getOne) ─────────────
  async getOne(filter: QueryFilter<BrandRequestDocument>) {
    return this.model.findOne(filter).exec();
  }

  // ─── UPDATE ONE ─────────────────────────
  async updateOne(
    filter: QueryFilter<BrandRequestDocument>,
    update: UpdateQuery<BrandRequestDocument>,
    options: any = { new: true },
  ) {
    return this.model.findOneAndUpdate(filter, update, options).exec();
  }

  // ─── PAGINATION ─────────────────────────
  async findWithPagination(
    filter: QueryFilter<BrandRequestDocument>,
    options: { skip: number; limit: number },
  ) {
    return this.model
      .find(filter)
      .skip(options.skip)
      .limit(options.limit)
      .exec();
  }

  // ─── COUNT ──────────────────────────────
  async countDocuments(filter: QueryFilter<BrandRequestDocument>) {
    return this.model.countDocuments(filter);
  }

  // ─── OPTIONAL (existing methods) ────────
  async findById(id: string) {
    return this.model.findById(id).populate('userId').exec();
  }

  async findByUserId(userId: string) {
    return this.model
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findAll(filter: QueryFilter<BrandRequestDocument> = {}) {
    return this.model.find(filter).populate('userId').exec();
  }

  async updateById(id: string, update: UpdateQuery<BrandRequestDocument>) {
    return this.model
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
  }
}