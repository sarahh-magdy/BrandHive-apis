import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './order.schema';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Order>): Promise<OrderDocument> {
    const order = new this.orderModel(data);
    return order.save();
  }

  async findById(id: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ _id: id, isDeleted: false })
      .populate('userId', 'name email phone')
      .exec();
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ orderNumber, isDeleted: false })
      .populate('userId', 'name email phone')
      .exec();
  }

  async findByUser(
    userId: string,
    filters: QueryFilter<OrderDocument> = {},
    options: { page: number; limit: number; sort?: Record<string, 1 | -1> },
  ): Promise<{ data: OrderDocument[]; total: number }> {
    const query: QueryFilter<OrderDocument> = {
      userId,
      isDeleted: false,
      ...filters,
    };

    const sort = options.sort ?? { createdAt: -1 };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { data: data as OrderDocument[], total };
  }

  async findBySeller(
    sellerId: string,
    filters: QueryFilter<OrderDocument> = {},
    options: { page: number; limit: number },
  ): Promise<{ data: OrderDocument[]; total: number }> {
    const query: QueryFilter<OrderDocument> = {
      'items.sellerId': sellerId,
      isDeleted: false,
      ...filters,
    };

    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { data: data as OrderDocument[], total };
  }

  async findAll(
    filters: QueryFilter<OrderDocument> = {},
    options: { page: number; limit: number; sort?: Record<string, 1 | -1> },
  ): Promise<{ data: OrderDocument[]; total: number }> {
    const query: QueryFilter<OrderDocument> = { isDeleted: false, ...filters };
    const sort = options.sort ?? { createdAt: -1 };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(options.limit)
        .populate('userId', 'name email')
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { data: data as OrderDocument[], total };
  }

  async update(
    id: string,
    update: UpdateQuery<OrderDocument>,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
  }

  async countByStatus(): Promise<{ status: string; count: number }[]> {
    return this.orderModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async revenueStats(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  }> {
    const result = await this.orderModel.aggregate([
      { $match: { isDeleted: false, status: { $ne: OrderStatus.CANCELED } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$pricing.total' },
        },
      },
    ]);

    return result[0] ?? { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
  }

  async revenueByPeriod(
    from: Date,
    to: Date,
  ): Promise<{ date: string; revenue: number; count: number }[]> {
    return this.orderModel.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $ne: OrderStatus.CANCELED },
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', revenue: 1, count: 1, _id: 0 } },
    ]);
  }

  async softDelete(id: string): Promise<void> {
    await this.orderModel.findByIdAndUpdate(id, { isDeleted: true });
  }

  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.orderModel.countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    return `ORD-${datePart}-${seq}`;
  }
}