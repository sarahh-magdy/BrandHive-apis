import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Wishlist } from './wishlist.schema';

@Injectable()
export class WishlistRepository extends AbstractRepository<Wishlist> {
  constructor(@InjectModel(Wishlist.name) wishlistModel: Model<Wishlist>) {
    super(wishlistModel);
  }

  async findWishlistPopulated(userId: string) {
    return this.model
      .findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice stock images isActive isDeleted slug sku stats',
      })
      .lean()
      .exec();
  }

  async getWishlistCount(userId: string): Promise<number> {
    const wishlist = await this.model
      .findOne({ user: userId })
      .select('items')
      .lean()
      .exec();
    return (wishlist as any)?.items?.length ?? 0;
  }
}