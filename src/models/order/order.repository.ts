import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './order.schema';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: any): Promise<OrderDocument> {
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
    const query = { userId, isDeleted: false, ...filters };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort(options.sort || { createdAt: -1 })
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
    const query = { 'items.sellerId': sellerId, isDeleted: false, ...filters };
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
    filters: any = {},
    options: { page: number; limit: number; sort?: any },
  ): Promise<{ data: OrderDocument[]; total: number }> {
    const query = { isDeleted: false, ...filters };
    const skip = (options.page - 1) * options.limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .populate('userId', 'name email')
        .lean()
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { data: data as OrderDocument[], total };
  }

  async update(id: string, update: UpdateQuery<OrderDocument>): Promise<OrderDocument | null> {
    return this.orderModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async generateOrderNumber(): Promise<string> {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }

  // Dashboard Aggregations
  async countByStatus(): Promise<any[]> {
    return this.orderModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]);
  }

  async revenueStats(): Promise<any> {
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
}