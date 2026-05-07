import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { StockLog } from './stock-log.schema';

@Injectable()
export class StockLogRepository extends AbstractRepository<StockLog> {
    constructor(
        @InjectModel(StockLog.name) private readonly stockLogModel: Model<StockLog>,
    ) {
        super(stockLogModel);
    }

    async findProductLogs(
        productId: string,
        options: { skip: number; limit: number },
    ) {
        return this.stockLogModel
            .find({ product: productId })
            .populate('changedBy', 'userName email')
            .sort({ createdAt: -1 })
            .skip(options.skip)
            .limit(options.limit)
            .lean()
            .exec();
    }

    async findWithPagination(
        filter: QueryFilter<StockLog>,
        options: { skip: number; limit: number },
    ) {
        return this.stockLogModel
            .find(filter)
            .populate('product', 'name sku')
            .populate('changedBy', 'userName email')
            .sort({ createdAt: -1 })
            .skip(options.skip)
            .limit(options.limit)
            .lean()
            .exec();
    }
}