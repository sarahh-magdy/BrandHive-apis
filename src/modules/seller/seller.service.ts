import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import slugify from 'slugify';

import { ProductRepository } from '../../models/product/product.repository';
import { OrderRepository } from '../../models/order/order.repository';
import { ReviewRepository } from '../../models/review/review.repository';
import { BazaarRepository } from '../../models/bazaar/bazaar.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CloudinaryService } from '../../config/cloudinary/cloudinary.service';
import { ProductFactoryService } from '../product/factory';

import {
    SellerCreateProductDto,
    SellerUpdateProductDto,
    GetSellerProductsDto,
    GetSellerOrdersDto,
    SellerAnalyticsDto,
    SellerAnalyticsPeriod,
    UpdateBazaarDto,
} from './dto/seller.dto';
import { StockChangeReason } from '../../models/stock-log/stock-log.schema';

@Injectable()
export class SellerService {
    constructor(
        private readonly productRepository: ProductRepository,
        private readonly orderRepository: OrderRepository,
        private readonly reviewRepository: ReviewRepository,
        private readonly bazaarRepository: BazaarRepository,
        private readonly inventoryService: InventoryService,
        private readonly cloudinaryService: CloudinaryService,
        private readonly productFactory: ProductFactoryService,
    ) { }

    // ════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ════════════════════════════════════════════════════════════════
    async getDashboard(sellerId: string) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const sellerObjId = new Types.ObjectId(sellerId);

        // ─── Get seller's product IDs ─────────────────────────────
        const sellerProducts = await this.productRepository.getAll(
            { seller: sellerObjId, isDeleted: false },
            undefined,
            { projection: '_id' },
        );
        const productIds = sellerProducts.map((p: any) => p._id);

        const [
            totalProducts,
            activeProducts,
            lowStockProducts,
            outOfStock,
            totalOrders,
            ordersToday,
            revenueResult,
            revenueTodayResult,
            pendingOrders,
            totalReviews,
            avgRatingResult,
        ] = await Promise.all([
            // Products
            this.productRepository.countDocuments({ seller: sellerObjId, isDeleted: false }),
            this.productRepository.countDocuments({ seller: sellerObjId, isDeleted: false, isActive: true }),
            this.productRepository.countDocuments({ seller: sellerObjId, isDeleted: false, stock: { $gt: 0, $lte: 5 } }),
            this.productRepository.countDocuments({ seller: sellerObjId, isDeleted: false, stock: 0 }),

            // Orders containing seller products
            this.orderRepository.countDocuments({ 'items.product': { $in: productIds } }),
            this.orderRepository.countDocuments({
                'items.product': { $in: productIds },
                createdAt: { $gte: todayStart },
            }),

            // Revenue
            this.orderRepository['orderModel']?.aggregate([
                { $match: { 'items.product': { $in: productIds }, paymentStatus: 'paid' } },
                { $unwind: '$items' },
                { $match: { 'items.product': { $in: productIds } } },
                { $group: { _id: null, total: { $sum: '$items.itemTotal' } } },
            ]) ?? [],

            // Revenue today
            this.orderRepository['orderModel']?.aggregate([
                {
                    $match: {
                        'items.product': { $in: productIds },
                        paymentStatus: 'paid',
                        createdAt: { $gte: todayStart },
                    },
                },
                { $unwind: '$items' },
                { $match: { 'items.product': { $in: productIds } } },
                { $group: { _id: null, total: { $sum: '$items.itemTotal' } } },
            ]) ?? [],

            // Pending
            this.orderRepository.countDocuments({
                'items.product': { $in: productIds },
                status: 'pending',
            }),

            // Reviews
            this.reviewRepository.countDocuments({ product: { $in: productIds } }),

            // Avg rating
            this.reviewRepository['reviewModel']?.aggregate([
                { $match: { product: { $in: productIds }, isVisible: true } },
                { $group: { _id: null, avg: { $avg: '$rating' } } },
            ]) ?? [],
        ]);

        return {
            data: {
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    lowStock: lowStockProducts,
                    outOfStock,
                },
                orders: {
                    total: totalOrders,
                    today: ordersToday,
                    pending: pendingOrders,
                },
                revenue: {
                    total: revenueResult[0]?.total ?? 0,
                    today: revenueTodayResult[0]?.total ?? 0,
                },
                reviews: {
                    total: totalReviews,
                    averageRating: Math.round((avgRatingResult[0]?.avg ?? 0) * 10) / 10,
                },
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // PRODUCTS — Seller Isolation
    // ════════════════════════════════════════════════════════════════
    async getMyProducts(sellerId: string, query: GetSellerProductsDto) {
        const { page = 1, limit = 10, search, category, isActive, lowStock } = query;
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = {
            seller: new Types.ObjectId(sellerId),
            isDeleted: false,
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }
        if (category) filter.category = new Types.ObjectId(category);
        if (isActive !== undefined) filter.isActive = isActive;
        if (lowStock) filter.stock = { $gt: 0, $lte: 5 };

        const [products, total] = await Promise.all([
            this.productRepository.findWithPagination(filter, { skip, limit }),
            this.productRepository.countDocuments(filter),
        ]);

        return {
            data: products.map((p) => this.productFactory.mapProduct(p)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async getMyProduct(sellerId: string, productId: string) {
        const product = await this.productRepository.findOnePopulated({
            _id: new Types.ObjectId(productId),
            seller: new Types.ObjectId(sellerId),
            isDeleted: false,
        });
        if (!product) throw new NotFoundException('Product not found');
        return { data: this.productFactory.mapProduct(product) };
    }

    async createProduct(
        sellerId: string,
        dto: SellerCreateProductDto,
        files: Express.Multer.File[],
    ) {
        if (dto.discountPrice !== undefined && dto.discountPrice >= dto.price) {
            throw new BadRequestException('Discount price must be less than original price');
        }

        // ─── Upload images ────────────────────────────────────────
        const uploadedImages = await this.cloudinaryService.uploadImages(
            files, 'products/images',
        );

        const sku = `${dto.name.slice(0, 3).toUpperCase().replace(/\s/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const slug = slugify(dto.name, { lower: true, trim: true, replacement: '-' });

        // ─── Check slug conflict ──────────────────────────────────
        const existing = await this.productRepository.getOne({ slug, isDeleted: false });
        if (existing) throw new ConflictException('Product name already exists');

        const product = await this.productRepository.create({
            name: dto.name,
            slug,
            sku,
            description: dto.description ?? null,
            price: dto.price,
            discountPrice: dto.discountPrice ?? null,
            stock: dto.stock,
            images: uploadedImages,
            tags: dto.tags ?? [],
            weight: dto.weight ?? null,
            dimensions: dto.dimensions ?? null,
            category: new Types.ObjectId(dto.category),
            brand: new Types.ObjectId(dto.brand),
            // ─── SELLER OWNERSHIP ──────────────────────────────────
            seller: new Types.ObjectId(sellerId),
            isActive: true,
            isDeleted: false,
            createdBy: new Types.ObjectId(sellerId),
            updatedBy: new Types.ObjectId(sellerId),
            stats: { averageRating: 0, totalReviews: 0 },
        } as any);

        return { message: 'Product created successfully', data: product };
    }

    async updateProduct(
        sellerId: string,
        productId: string,
        dto: SellerUpdateProductDto,
        files?: Express.Multer.File[],
    ) {
        // ─── Ownership check ──────────────────────────────────────
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(productId),
            seller: new Types.ObjectId(sellerId),
            isDeleted: false,
        });
        if (!product) throw new ForbiddenException('Product not found or not yours');

        if (dto.discountPrice !== undefined) {
            const effectivePrice = dto.price ?? (product as any).price;
            if (dto.discountPrice >= effectivePrice) {
                throw new BadRequestException('Discount price must be less than original price');
            }
        }

        const updates: Record<string, any> = { updatedBy: new Types.ObjectId(sellerId) };

        if (dto.name) {
            const slug = slugify(dto.name, { lower: true, trim: true, replacement: '-' });
            const conflict = await this.productRepository.getOne({
                slug,
                isDeleted: false,
                _id: { $ne: new Types.ObjectId(productId) },
            });
            if (conflict) throw new ConflictException('Product name already exists');
            updates.name = dto.name;
            updates.slug = slug;
        }

        if (dto.description !== undefined) updates.description = dto.description ?? null;
        if (dto.price !== undefined) updates.price = dto.price;
        if (dto.discountPrice !== undefined) updates.discountPrice = dto.discountPrice ?? null;
        if (dto.stock !== undefined) updates.stock = dto.stock;
        if (dto.tags !== undefined) updates.tags = dto.tags;
        if (dto.weight !== undefined) updates.weight = dto.weight ?? null;
        if (dto.dimensions !== undefined) updates.dimensions = dto.dimensions ?? null;
        if (dto.category !== undefined) updates.category = new Types.ObjectId(dto.category);
        if (dto.brand !== undefined) updates.brand = new Types.ObjectId(dto.brand);

        if (files?.length) {
            const oldPublicIds = ((product as any).images ?? [])
                .map((img: any) => img.publicId)
                .filter(Boolean);
            if (oldPublicIds.length) await this.cloudinaryService.deleteImages(oldPublicIds);
            updates.images = await this.cloudinaryService.uploadImages(files, 'products/images');
        }

        const updated = await this.productRepository.updateOne(
            { _id: new Types.ObjectId(productId) },
            updates,
            { new: true },
        );

        return { message: 'Product updated successfully', data: updated };
    }

    async deleteProduct(sellerId: string, productId: string) {
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(productId),
            seller: new Types.ObjectId(sellerId),
            isDeleted: false,
        });
        if (!product) throw new ForbiddenException('Product not found or not yours');

        // ─── Delete images from Cloudinary ────────────────────────
        const publicIds = ((product as any).images ?? [])
            .map((img: any) => img.publicId)
            .filter(Boolean);
        if (publicIds.length) await this.cloudinaryService.deleteImages(publicIds);

        await this.productRepository.updateOne(
            { _id: new Types.ObjectId(productId) },
            { isDeleted: true, deletedBy: new Types.ObjectId(sellerId), deletedAt: new Date() },
            { new: true },
        );

        return { message: 'Product deleted successfully' };
    }

    // ════════════════════════════════════════════════════════════════
    // INVENTORY — Seller manages only HIS products
    // ════════════════════════════════════════════════════════════════
    async adjustStock(
        sellerId: string,
        productId: string,
        change: number,
        note?: string,
    ) {
        // ─── Ownership check ──────────────────────────────────────
        const product = await this.productRepository.getOne({
            _id: new Types.ObjectId(productId),
            seller: new Types.ObjectId(sellerId),
            isDeleted: false,
        });
        if (!product) throw new ForbiddenException('Product not found or not yours');

        return this.inventoryService.adjustStock(
            {
                productId,
                change,
                reason: StockChangeReason.MANUAL_ADD,
                note: note ?? 'Seller stock adjustment',
            },
            sellerId,
        );
    }

    async getStockAlerts(sellerId: string) {
        const sellerObjId = new Types.ObjectId(sellerId);

        const [lowStock, outOfStock] = await Promise.all([
            this.productRepository.getLowStockProducts(5),
            this.productRepository.getOutOfStockProducts({ skip: 0, limit: 50 }),
        ]);

        // ─── Filter only seller's products ────────────────────────
        const filterBySeller = (products: any[]) =>
            products.filter((p) => p.seller?.toString() === sellerId);

        return {
            data: {
                lowStock: filterBySeller(lowStock),
                outOfStock: filterBySeller(outOfStock as any[]),
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // ORDERS — Seller sees orders with HIS products
    // ════════════════════════════════════════════════════════════════
    async getMyOrders(sellerId: string, query: GetSellerOrdersDto) {
        const { page = 1, limit = 10, status, dateFrom, dateTo } = query;
        const skip = (page - 1) * limit;

        // ─── Get seller product IDs ───────────────────────────────
        const sellerProducts = await this.productRepository.getAll(
            { seller: new Types.ObjectId(sellerId), isDeleted: false },
        );
        const productIds = sellerProducts.map((p: any) => p._id);

        const filter: Record<string, any> = {
            'items.product': { $in: productIds },
        };

        if (status) filter.status = status;
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }

        const [orders, total] = await Promise.all([
            this.orderRepository.findWithPaginationPopulated(filter, { skip, limit }),
            this.orderRepository.countDocuments(filter),
        ]);

        // ─── Filter order items to show ONLY seller's products ────
        const filteredOrders = orders.map((order: any) => ({
            ...order,
            items: order.items.filter((item: any) =>
                productIds.some((id: any) => id.toString() === item.product?._id?.toString()),
            ),
        }));

        return {
            data: filteredOrders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async getMyOrderDetails(sellerId: string, orderId: string) {
        const sellerProducts = await this.productRepository.getAll(
            { seller: new Types.ObjectId(sellerId), isDeleted: false },
        );
        const productIds = sellerProducts.map((p: any) => p._id);

        const order = await this.orderRepository.findOnePopulated({
            _id: new Types.ObjectId(orderId),
            'items.product': { $in: productIds },
        });

        if (!order) throw new NotFoundException('Order not found');

        // ─── Show only seller's items ─────────────────────────────
        const filtered = {
            ...(order as any),
            items: (order as any).items.filter((item: any) =>
                productIds.some((id: any) => id.toString() === item.product?._id?.toString()),
            ),
        };

        return { data: filtered };
    }

    // ════════════════════════════════════════════════════════════════
    // ANALYTICS
    // ════════════════════════════════════════════════════════════════
    async getAnalytics(sellerId: string, query: SellerAnalyticsDto) {
        const { period = SellerAnalyticsPeriod.MONTH } = query;

        const sellerProducts = await this.productRepository.getAll(
            { seller: new Types.ObjectId(sellerId), isDeleted: false },
        );
        const productIds = sellerProducts.map((p: any) => p._id);

        const periodDates: Record<SellerAnalyticsPeriod, Date> = {
            [SellerAnalyticsPeriod.WEEK]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            [SellerAnalyticsPeriod.MONTH]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            [SellerAnalyticsPeriod.YEAR]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        };

        const orderModel = (this.orderRepository as any)['orderModel'];

        const [salesTimeline, topProducts, ordersByStatus] = await Promise.all([
            // Sales per day
            orderModel.aggregate([
                {
                    $match: {
                        'items.product': { $in: productIds },
                        paymentStatus: 'paid',
                        createdAt: { $gte: periodDates[period] },
                    },
                },
                { $unwind: '$items' },
                { $match: { 'items.product': { $in: productIds } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$items.itemTotal' },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
            ]),

            // Top products
            orderModel.aggregate([
                {
                    $match: {
                        'items.product': { $in: productIds },
                        status: { $in: ['confirmed', 'shipped', 'delivered'] },
                    },
                },
                { $unwind: '$items' },
                { $match: { 'items.product': { $in: productIds } } },
                {
                    $group: {
                        _id: '$items.product',
                        productName: { $first: '$items.productName' },
                        totalSold: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.itemTotal' },
                    },
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 },
            ]),

            // Orders by status
            orderModel.aggregate([
                { $match: { 'items.product': { $in: productIds } } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        return {
            data: {
                salesTimeline,
                topProducts,
                ordersByStatus: ordersByStatus.reduce((acc: any, i: any) => {
                    acc[i._id] = i.count;
                    return acc;
                }, {}),
            },
        };
    }

    // ════════════════════════════════════════════════════════════════
    // REVIEWS — seller sees reviews on his products
    // ════════════════════════════════════════════════════════════════
    async getMyReviews(sellerId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const sellerProducts = await this.productRepository.getAll(
            { seller: new Types.ObjectId(sellerId), isDeleted: false },
        );
        const productIds = sellerProducts.map((p: any) => p._id);

        const filter = { product: { $in: productIds }, isVisible: true };

        const [data, total] = await Promise.all([
            this.reviewRepository.findWithPaginationPopulated(filter, { skip, limit }),
            this.reviewRepository.countDocuments(filter),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    // ════════════════════════════════════════════════════════════════
    // BAZAAR — seller store page
    // ════════════════════════════════════════════════════════════════
    async getMyBazaar(sellerId: string) {
        let bazaar = await this.bazaarRepository.getOne({
            seller: new Types.ObjectId(sellerId),
        });

        // ─── Auto-create bazaar on first access ───────────────────
        if (!bazaar) {
            bazaar = await this.bazaarRepository.create({
                seller: new Types.ObjectId(sellerId),
                storeName: `Store-${sellerId.slice(-6)}`,
                storeSlug: `store-${sellerId.slice(-6).toLowerCase()}`,
                description: null,
                phone: null,
                whatsappLink: null,
                website: null,
                logo: null,
                banner: null,
                featuredCategories: [],
                isActive: true,
                stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, averageRating: 0, totalReviews: 0 },
            } as any);
        }

        return { data: bazaar };
    }

    async updateBazaar(
        sellerId: string,
        dto: UpdateBazaarDto,
        logoFile?: Express.Multer.File,
        bannerFile?: Express.Multer.File,
    ) {
        const bazaar = await this.bazaarRepository.getOne({
            seller: new Types.ObjectId(sellerId),
        });
        if (!bazaar) throw new NotFoundException('Bazaar not found');

        const updates: Record<string, any> = { ...dto };

        if (dto.storeName) {
            const slug = slugify(dto.storeName, { lower: true, trim: true, replacement: '-' });
            const conflict = await this.bazaarRepository.getOne({
                storeSlug: slug,
                seller: { $ne: new Types.ObjectId(sellerId) },
            });
            if (conflict) throw new ConflictException('Store name already taken');
            updates.storeSlug = slug;
        }

        if (dto.featuredCategories) {
            updates.featuredCategories = dto.featuredCategories.map(
                (id) => new Types.ObjectId(id),
            );
        }

        // ─── Upload logo ──────────────────────────────────────────
        if (logoFile) {
            if ((bazaar as any).logo?.publicId) {
                await this.cloudinaryService.deleteImage((bazaar as any).logo.publicId);
            }
            const uploaded = await this.cloudinaryService.uploadImage(logoFile, 'bazaar/logos');
            updates.logo = { url: uploaded.url, publicId: uploaded.publicId };
        }

        // ─── Upload banner ────────────────────────────────────────
        if (bannerFile) {
            if ((bazaar as any).banner?.publicId) {
                await this.cloudinaryService.deleteImage((bazaar as any).banner.publicId);
            }
            const uploaded = await this.cloudinaryService.uploadImage(bannerFile, 'bazaar/banners');
            updates.banner = { url: uploaded.url, publicId: uploaded.publicId };
        }

        const updated = await this.bazaarRepository.updateOne(
            { seller: new Types.ObjectId(sellerId) },
            updates,
            { new: true },
        );

        return { message: 'Bazaar updated successfully', data: updated };
    }

    // ─── Public: Get bazaar by slug ───────────────────────────────
    async getBazaarBySlug(storeSlug: string, page = 1, limit = 12) {
        const bazaar = await this.bazaarRepository.findBySlugPopulated(storeSlug);
        if (!bazaar) throw new NotFoundException('Store not found');

        const skip = (page - 1) * limit;
        const sellerId = (bazaar as any).seller?._id ?? (bazaar as any).seller;

        const products = await this.productRepository.findWithPagination(
            { seller: sellerId, isDeleted: false, isActive: true },
            { skip, limit },
        );

        return {
            data: {
                bazaar,
                products: products.map((p) => this.productFactory.mapProduct(p)),
            },
        };
    }

    // ─── Public: Search bazaars ───────────────────────────────────
    async searchBazaars(search: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const filter: Record<string, any> = { isActive: true };

        if (search) {
            filter.$or = [
                { storeName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const [data, total] = await Promise.all([
            this.bazaarRepository.findAllBazaars(filter, { skip, limit }),
            this.bazaarRepository.countDocuments(filter),
        ]);

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}