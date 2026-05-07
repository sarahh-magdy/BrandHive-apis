import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Order } from './order.schema';

@Injectable()
export class OrderRepository extends AbstractRepository<Order> {
  // ─── Expose orderModel for aggregations in SellerService ──────
  public readonly orderModel: Model<Order>;

  constructor(@InjectModel(Order.name) orderModel: Model<Order>) {
    super(orderModel);
    this.orderModel = orderModel;
  }

  // ─── Base paginated fetch ──────────────────────────────────────
  async findWithPaginationPopulated(
    filter: QueryFilter<Order>,
    options: { skip: number; limit: number; sort?: Record<string, any> },
  ) {
    return this.orderModel
      .find(filter)
      .populate('user', 'userName email')
      .populate('items.product', 'name slug images seller')
      .sort(options.sort ?? { createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async findOnePopulated(filter: QueryFilter<Order>) {
    return this.orderModel
      .findOne(filter)
      .populate('user', 'userName email phone')
      .populate('items.product', 'name slug images sku seller')
      .lean()
      .exec();
  }

  // ─── ADDED: Seller-specific order fetch ───────────────────────
  // Orders that contain at least one of seller's products
  async findSellerOrders(
    productIds: Types.ObjectId[],
    filter: QueryFilter<Order>,
    options: { skip: number; limit: number },
  ) {
    return this.orderModel
      .find({
        'items.product': { $in: productIds },
        ...filter,
      })
      .populate('user', 'userName email')
      .populate('items.product', 'name slug images sku seller')
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean()
      .exec();
  }

  async countSellerOrders(productIds: Types.ObjectId[], filter: QueryFilter<Order> = {}) {
    return this.orderModel.countDocuments({
      'items.product': { $in: productIds },
      ...filter,
    });
  }

  // ─── Admin Analytics ──────────────────────────────────────────
  async getOrderStats() {
    return this.orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]);
  }

  async getTopProducts(limit = 10) {
    return this.orderModel.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.itemTotal' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);
  }

  async getRevenueByPeriod(groupBy: 'day' | 'month' | 'year' = 'month') {
    const formats = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' };
    return this.orderModel.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: { $dateToString: { format: formats[groupBy], date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}