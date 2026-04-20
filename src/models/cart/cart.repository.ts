import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Cart } from './cart.schema';

@Injectable()
export class CartRepository extends AbstractRepository<Cart> {
  constructor(@InjectModel(Cart.name) cartModel: Model<Cart>) {
    super(cartModel);
  }

  // بيجيب الـ cart مع كل تفاصيل المنتجات
  async findCartPopulated(userId: string) {
    return this.model
      .findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice stock images isActive isDeleted slug',
      })
      .lean()
      .exec();
  }
}