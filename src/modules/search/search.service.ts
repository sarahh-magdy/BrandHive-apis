import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductRepository } from '../../models/product/product.repository';
import { ProductFactoryService } from '../product/factory';
import { SearchProductsDto, SortBy } from './dto/search.dto';
import { BrandRepository } from '../../models/brand/brand.repository';

// ─── Low Stock Threshold ───────────────────────────────────────────
export const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class SearchService {
    constructor(
        private readonly productRepository: ProductRepository,
        private readonly productFactory: ProductFactoryService,
        private readonly brandRepository: BrandRepository, // ─── ADDED

    ) { }

    // ════════════════════════════════════════════════════════════════
    // SEARCH & FILTER PRODUCTS
    // ════════════════════════════════════════════════════════════════
    async searchProducts(query: SearchProductsDto) {
        const {
            page = 1,
            limit = 12,
            search,
            category,
            brand,
            minPrice,
            maxPrice,
            minRating,
            inStock,
            onSale,
            sortBy = SortBy.NEWEST,
            withFacets = false,
            shipsInternationally
        } = query;

        const skip = (page - 1) * limit;

        // ─── Base filter (always applied) ─────────────────────────
        const baseFilter: Record<string, any> = {
            isDeleted: false,
            isActive: true,
        };

        // ─── Search (text across name, description, tags, sku) ────
        if (search) {
            baseFilter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $elemMatch: { $regex: search, $options: 'i' } } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }
        // ─── Ships internationally filter ────────────────────────────
        // بنجيب الـ brand IDs اللي shipsInternationally = true
        // وبنضيفها على فلتر الـ brand
        if (shipsInternationally !== undefined) {
            const matchingBrands = await this.brandRepository.findByFilter({
                shipsInternationally,
                isDeleted: false,
                isActive: true,
            });

            const brandIds = matchingBrands.map((b: any) => b._id);

            // لو في brand filter تاني → تقاطع الاتنين
            if (baseFilter.brand) {
                const existing =
                    baseFilter.brand.$in ?? [baseFilter.brand];
                const intersection = existing.filter((id: Types.ObjectId) =>
                    brandIds.some((b: Types.ObjectId) => b.equals(id)),
                );
                baseFilter.brand = intersection.length === 1
                    ? intersection[0]
                    : { $in: intersection };
            } else {
                baseFilter.brand = { $in: brandIds };
            }
        }

        // ─── Category filter ──────────────────────────────────────
        if (category) {
            baseFilter.category = new Types.ObjectId(category);
        }

        // ─── Brand filter (supports multiple: brand=id1,id2) ──────
        if (brand) {
            const brandIds = brand
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean)
                .map((id) => new Types.ObjectId(id));

            baseFilter.brand = brandIds.length === 1
                ? brandIds[0]
                : { $in: brandIds };
        }

        // ─── Price range ──────────────────────────────────────────
        if (minPrice !== undefined || maxPrice !== undefined) {
            baseFilter.price = {};
            if (minPrice !== undefined) baseFilter.price.$gte = minPrice;
            if (maxPrice !== undefined) baseFilter.price.$lte = maxPrice;
        }

        // ─── Minimum rating ───────────────────────────────────────
        if (minRating !== undefined) {
            baseFilter['stats.averageRating'] = { $gte: minRating };
        }

        // ─── Stock filter ─────────────────────────────────────────
        if (inStock === true) baseFilter.stock = { $gt: 0 };
        if (inStock === false) baseFilter.stock = 0;

        // ─── On sale filter ───────────────────────────────────────
        if (onSale === true) {
            baseFilter.discountPrice = { $ne: null, $exists: true };
            baseFilter.$expr = { $lt: ['$discountPrice', '$price'] };
        }

        // ─── Sort mapping ─────────────────────────────────────────
        const sortMap: Record<SortBy, Record<string, any>> = {
            [SortBy.NEWEST]: { createdAt: -1 },
            [SortBy.PRICE_ASC]: { price: 1 },
            [SortBy.PRICE_DESC]: { price: -1 },
            [SortBy.RATING]: { 'stats.averageRating': -1, 'stats.totalReviews': -1 },
            [SortBy.BEST_SELLING]: { 'stats.totalReviews': -1 },
            [SortBy.RELEVANCE]: search ? { score: { $meta: 'textScore' } } : { createdAt: -1 },
        };

        const sort = sortMap[sortBy] ?? { createdAt: -1 };

        // ─── Execute query ────────────────────────────────────────
        const [products, total, facets] = await Promise.all([
            this.productRepository.findWithFilters(baseFilter, { skip, limit, sort }),
            this.productRepository.countDocuments(baseFilter),
            withFacets ? this.productRepository.getFacets(baseFilter) : null,
        ]);

        // ─── Map products ─────────────────────────────────────────
        const data = products.map((p) => this.productFactory.mapProduct(p));

        const response: any = {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                // ─── Stock summary ────────────────────────────────────
                inStockCount: data.filter((p) => !p.isOutOfStock).length,
                outOfStockCount: data.filter((p) => p.isOutOfStock).length,
                onSaleCount: data.filter((p) => p.isOnSale).length,
            },
        };

        if (facets) response.facets = facets;

        return response;
    }

    // ════════════════════════════════════════════════════════════════
    // GET FACETS ONLY (for sidebar without re-fetching products)
    // ════════════════════════════════════════════════════════════════
    async getFacets(query: Omit<SearchProductsDto, 'page' | 'limit' | 'sortBy'>) {
        const filter: Record<string, any> = { isDeleted: false, isActive: true };

        if (query.category) filter.category = new Types.ObjectId(query.category);
        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { tags: { $elemMatch: { $regex: query.search, $options: 'i' } } },
            ];
        }

        return this.productRepository.getFacets(filter);
    }
}