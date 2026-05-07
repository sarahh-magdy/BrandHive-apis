import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminFiltersDto, AnalyticsDto, AnalyticsPeriod } from './dto/admin-filters.dto';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel('User') private readonly userModel: Model<any>,
        @InjectModel('Order') private readonly orderModel: Model<any>,
        @InjectModel('Product') private readonly productModel: Model<any>,
        @InjectModel('Review') private readonly reviewModel: Model<any>,
    ) { }

    // ════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ════════════════════════════════════════════════════════════════
    async getDashboard() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            totalCustomers,
            totalSellers,
            totalOrders,
            totalProducts,
            totalReviews,
            ordersToday,
            revenueResult,
            revenueTodayResult,
            pendingOrders,
            lowStockCount,
            ordersByStatus,
        ] = await Promise.all([
            this.userModel.countDocuments({}),
            this.userModel.countDocuments({ role: 'Customer' }),
            this.userModel.countDocuments({ role: 'Seller' }),
            this.orderModel.countDocuments({}),
            this.productModel.countDocuments({ isDeleted: false }),
            this.reviewModel.countDocuments({}),
            this.orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
            this.orderModel.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            this.orderModel.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: todayStart } } },
                { $group: { _id: null, total: { $sum: '$total' } } },
            ]),
            this.orderModel.countDocuments({ status: 'pending' }),
            this.productModel.countDocuments({
                isDeleted: false,
                isActive: true,
                stock: { $gt: 0, $lte: 5 },
            }),
            this.orderModel.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        return {
            data: {
                overview: {
                    totalUsers,
                    totalCustomers,
                    totalSellers,
                    totalOrders,
                    totalProducts,
                    totalReviews,
                    totalRevenue: revenueResult[0]?.total ?? 0,
                },
                today: {
                    ordersToday,
                    revenueToday: revenueTodayResult[0]?.total ?? 0,
                },
                alerts: {
                    pendingOrders,
                    lowStockProducts: lowStockCount,
                },
                ordersByStatus: ordersByStatus.reduce((acc: any, item: any) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // REVENUE ANALYTICS
    // ════════════════════════════════════════════════════════════════
    async getRevenueAnalytics(query: AnalyticsDto) {
        const { period = AnalyticsPeriod.MONTH, dateFrom, dateTo } = query;

        const match: Record<string, any> = { paymentStatus: 'paid' };

        if (dateFrom || dateTo) {
            match.createdAt = {};
            if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
            if (dateTo) match.createdAt.$lte = new Date(dateTo);
        } else {
            const defaults: Record<AnalyticsPeriod, Date> = {
                [AnalyticsPeriod.DAY]: new Date(Date.now() - 24 * 60 * 60 * 1000),
                [AnalyticsPeriod.WEEK]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                [AnalyticsPeriod.MONTH]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                [AnalyticsPeriod.YEAR]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            };
            match.createdAt = { $gte: defaults[period] };
        }

        const groupFormats: Record<AnalyticsPeriod, string> = {
            [AnalyticsPeriod.DAY]: '%Y-%m-%dT%H:00',
            [AnalyticsPeriod.WEEK]: '%Y-%m-%d',
            [AnalyticsPeriod.MONTH]: '%Y-%m-%d',
            [AnalyticsPeriod.YEAR]: '%Y-%m',
        };

        const data = await this.orderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormats[period], date: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', orders: 1, revenue: 1 } },
        ]);

        const totalRevenue = data.reduce((s: number, d: any) => s + d.revenue, 0);
        const totalOrders = data.reduce((s: number, d: any) => s + d.orders, 0);

        return {
            data,
            summary: {
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalOrders,
                averageOrderValue: totalOrders > 0
                    ? Math.round((totalRevenue / totalOrders) * 100) / 100
                    : 0,
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // ORDERS ANALYTICS
    // ════════════════════════════════════════════════════════════════
    async getOrdersAnalytics(query: AnalyticsDto) {
        const { period = AnalyticsPeriod.MONTH } = query;

        const defaults: Record<AnalyticsPeriod, Date> = {
            [AnalyticsPeriod.DAY]: new Date(Date.now() - 24 * 60 * 60 * 1000),
            [AnalyticsPeriod.WEEK]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            [AnalyticsPeriod.MONTH]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            [AnalyticsPeriod.YEAR]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        };

        const [byStatus, byPayment, timeline] = await Promise.all([
            this.orderModel.aggregate([
                { $match: { createdAt: { $gte: defaults[period] } } },
                { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
            ]),
            this.orderModel.aggregate([
                { $match: { createdAt: { $gte: defaults[period] } } },
                { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
            ]),
            this.orderModel.aggregate([
                { $match: { createdAt: { $gte: defaults[period] } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', count: 1 } },
            ]),
        ]);

        return {
            data: {
                byStatus: byStatus.reduce((acc: any, i: any) => {
                    acc[i._id] = { count: i.count, revenue: i.revenue };
                    return acc;
                }, {}),
                byPayment: byPayment.reduce((acc: any, i: any) => {
                    acc[i._id] = i.count;
                    return acc;
                }, {}),
                timeline,
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // TOP PRODUCTS
    // ════════════════════════════════════════════════════════════════
    async getTopProducts(query: AnalyticsDto) {
        const { limit = 10 } = query;

        const data = await this.orderModel.aggregate([
            { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    productName: { $first: '$items.productName' },
                    totalSold: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.itemTotal' },
                    orderCount: { $sum: 1 },
                },
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            // ─── FIXED: preserveNullAndEmpty → preserveNullAndEmptyArrays
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    productName: 1,
                    totalSold: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    sku: '$product.sku',
                    stock: '$product.stock',
                    image: { $arrayElemAt: ['$product.images', 0] },
                },
            },
        ]);

        return { data };
    }

    // ════════════════════════════════════════════════════════════════
    // TOP CUSTOMERS
    // ════════════════════════════════════════════════════════════════
    async getTopCustomers(query: AnalyticsDto) {
        const { limit = 10 } = query;

        const data = await this.orderModel.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: '$user',
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$total' },
                },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    totalOrders: 1,
                    totalSpent: 1,
                    userName: '$user.userName',
                    email: '$user.email',
                },
            },
        ]);

        return { data };
    }

    // ════════════════════════════════════════════════════════════════
    // USERS MANAGEMENT
    // ════════════════════════════════════════════════════════════════
    async getUsers(query: AdminFiltersDto) {
        const { page = 1, limit = 10, search, role } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = {};
        if (role) filter.role = role;
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.userModel
                .find(filter)
                .select('-password -otp -otpExpiry -otpAttempts -otpLockedUntil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.userModel.countDocuments(filter),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async toggleUserStatus(userId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const isVerified = !(user as any).isVerified;
        await this.userModel.findByIdAndUpdate(userId, { isVerified });

        return {
            message: `User ${isVerified ? 'activated' : 'deactivated'} successfully`,
        };
    }

    async deleteUser(userId: string) {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        await this.userModel.findByIdAndDelete(userId);
        return { message: 'User deleted successfully' };
    }
}