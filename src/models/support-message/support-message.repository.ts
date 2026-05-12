import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { SupportMessage } from './support-message.schema';

@Injectable()
export class SupportMessageRepository extends AbstractRepository<SupportMessage> {
  constructor(
    @InjectModel(SupportMessage.name)
    private readonly supportModel: Model<SupportMessage>,
  ) {
    super(supportModel);
  }

  async findWithPagination(
    filter: QueryFilter<SupportMessage>,
    options: { skip: number; limit: number },
  ) {
    return this.supportModel
      .find(filter)
      .populate('user', 'userName email')
      .populate('repliedBy', 'userName email')
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }
}