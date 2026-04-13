import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { BrandRequest } from './brand-request.schema';

@Injectable()
export class BrandRequestRepository extends AbstractRepository<BrandRequest> {
  constructor(
    @InjectModel(BrandRequest.name)
    private readonly brandRequestModel: Model<BrandRequest>,
  ) {
    super(brandRequestModel);
  }

  async findWithPagination(
    filter: QueryFilter<BrandRequest>,
    options: { skip: number; limit: number },
  ) {
    return this.brandRequestModel
      .find(filter)
      .populate('requestedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('categories', 'name slug')
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async countDocuments(filter: QueryFilter<BrandRequest>): Promise<number> {
    return this.brandRequestModel.countDocuments(filter).exec();
  }
}