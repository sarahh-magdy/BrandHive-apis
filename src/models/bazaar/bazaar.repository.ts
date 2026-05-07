import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Bazaar } from './bazaar.schema';

@Injectable()
export class BazaarRepository extends AbstractRepository<Bazaar> {
    constructor(
        @InjectModel(Bazaar.name) private readonly bazaarModel: Model<Bazaar>,
    ) {
        super(bazaarModel);
    }

    async findBySlugPopulated(storeSlug: string) {
        return this.bazaarModel
            .findOne({ storeSlug, isActive: true })
            .populate('seller', 'userName email')
            .populate('featuredCategories', 'name slug')
            .lean()
            .exec();
    }

    async findAllBazaars(
        filter: QueryFilter<Bazaar>,
        options: { skip: number; limit: number },
    ) {
        return this.bazaarModel
            .find(filter)
            .populate('seller', 'userName email')
            .sort({ 'stats.totalRevenue': -1 })
            .skip(options.skip)
            .limit(options.limit)
            .lean()
            .exec();
    }
}