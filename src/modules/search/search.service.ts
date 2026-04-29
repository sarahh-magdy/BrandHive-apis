// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, QueryFilter, SortOrder } from 'mongoose';
// import {
//   SearchHistory,
//   SearchHistoryDocument,
//   PopularSearch,
//   PopularSearchDocument,
// } from '../../models/search/search.schema';
// import { AutocompleteDto, SearchDto, SearchSortBy } from './dto/search.dto';

// /**
//  * IProductModel — inject your actual Product Mongoose model.
//  * Using `any` here so the search module stays decoupled from ProductModule.
//  */

// @Injectable()
// export class SearchService {
//   constructor(
//     @InjectModel('Product') private readonly productModel: Model<any>,
//     @InjectModel(SearchHistory.name)
//     private readonly searchHistoryModel: Model<SearchHistoryDocument>,
//     @InjectModel(PopularSearch.name)
//     private readonly popularSearchModel: Model<PopularSearchDocument>,
//   ) {}

//   // ─────────────────────────────────────────────────────────────
//   // MAIN SEARCH
//   // ─────────────────────────────────────────────────────────────

//   async search(
//     dto: SearchDto,
//     userId?: string,
//   ): Promise<{
//     data: any[];
//     total: number;
//     page: number;
//     limit: number;
//     totalPages: number;
//     facets: {
//       priceRange: { min: number; max: number };
//       brands: { _id: string; name: string; count: number }[];
//       ratings: { rating: number; count: number }[];
//     };
//   }> {
//     const query = this.buildQuery(dto);
//     const sort = this.buildSort(dto.sortBy ?? SearchSortBy.RELEVANCE, !!dto.q);
//     const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);

//     // Run product query + aggregation facets in parallel
//     const [products, total, facets] = await Promise.all([
//       this.productModel
//         .find(query)
//         .sort(sort)
//         .skip(skip)
//         .limit(dto.limit ?? 20)
//         .populate('categoryId', 'name slug')
//         .populate('brandId', 'name logo')
//         .lean()
//         .exec(),
//       this.productModel.countDocuments(query),
//       this.getFacets(query),
//     ]);

//     // Persist search history asynchronously (fire & forget)
//     if (dto.q?.trim()) {
//       this.persistSearchHistory(dto, userId, total).catch(() => null);
//     }

//     return {
//       data: products,
//       total,
//       page: dto.page ?? 1,
//       limit: dto.limit ?? 20,
//       totalPages: Math.ceil(total / (dto.limit ?? 20)),
//       facets,
//     };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // AUTOCOMPLETE  (fast prefix-match on product names)
//   // ─────────────────────────────────────────────────────────────

//   async autocomplete(dto: AutocompleteDto): Promise<{
//     products: { _id: string; name: string; image?: string; price: number }[];
//     suggestions: string[];
//   }> {
//     const q = dto.q?.trim();
//     if (!q || q.length < 2) return { products: [], suggestions: [] };

//     const regex = { $regex: `^${q}`, $options: 'i' };

//     const [products, popular] = await Promise.all([
//       this.productModel
//         .find({ name: regex, isActive: true, stock: { $gt: 0 } })
//         .select('name price images slug')
//         .limit(6)
//         .lean(),
//       this.popularSearchModel
//         .find({ query: regex })
//         .sort({ count: -1 })
//         .limit(5)
//         .lean(),
//     ]);

//     return {
//       products: products.map((p: any) => ({
//         _id: p._id,
//         name: p.name,
//         image: p.images?.[0]?.url,
//         price: p.price,
//       })),
//       suggestions: popular.map((p) => p.query),
//     };
//   }

//   // ─────────────────────────────────────────────────────────────
//   // POPULAR / TRENDING SEARCHES
//   // ─────────────────────────────────────────────────────────────

//   async getTrendingSearches(limit = 10): Promise<string[]> {
//     const results = await this.popularSearchModel
//       .find()
//       .sort({ count: -1 })
//       .limit(limit)
//       .lean();

//     return results.map((r) => r.query);
//   }

//   // ─────────────────────────────────────────────────────────────
//   // USER SEARCH HISTORY
//   // ─────────────────────────────────────────────────────────────

//   async getUserSearchHistory(
//     userId: string,
//     limit = 10,
//   ): Promise<{ query: string; createdAt: Date }[]> {
//     // Return distinct recent queries per user
//     const results = await this.searchHistoryModel
//       .find({ userId })
//       .sort({ createdAt: -1 })
//       .limit(limit * 3) // over-fetch to deduplicate
//       .lean();

//     const seen = new Set<string>();
//     const unique: { query: string; createdAt: Date }[] = [];

//     for (const r of results) {
//       if (!seen.has(r.queryNorm)) {
//         seen.add(r.queryNorm);
//         unique.push({ query: r.query, createdAt: r.createdAt });
//         if (unique.length >= limit) break;
//       }
//     }

//     return unique;
//   }

//   async clearUserSearchHistory(userId: string): Promise<void> {
//     await this.searchHistoryModel.deleteMany({ userId });
//   }

//   // ─────────────────────────────────────────────────────────────
//   // HELPERS — private
//   // ─────────────────────────────────────────────────────────────

//   private buildQuery(dto: SearchDto): QueryFilter<any> {
//     const query: QueryFilter<any> = { isActive: true };

//     // Full-text search on name + description
//     if (dto.q?.trim()) {
//       query.$or = [
//         { name:        { $regex: dto.q.trim(), $options: 'i' } },
//         { description: { $regex: dto.q.trim(), $options: 'i' } },
//         { tags:        { $regex: dto.q.trim(), $options: 'i' } },
//       ];
//     }

//     if (dto.categoryId) query.categoryId = dto.categoryId;

//     // Single brandId OR multiple brandIds
//     if (dto.brandIds?.length) {
//       query.brandId = { $in: dto.brandIds };
//     } else if (dto.brandId) {
//       query.brandId = dto.brandId;
//     }

//     // Price range
//     if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
//       query.price = {};
//       if (dto.minPrice !== undefined) query.price.$gte = dto.minPrice;
//       if (dto.maxPrice !== undefined) query.price.$lte = dto.maxPrice;
//     }

//     // Minimum rating
//     if (dto.minRating !== undefined) {
//       query.averageRating = { $gte: dto.minRating };
//     }

//     // In-stock only
//     if (dto.inStockOnly) {
//       query.stock = { $gt: 0 };
//     }

//     return query;
//   }

//   private buildSort(
//     sortBy: SearchSortBy,
//     hasTextQuery: boolean,
//   ): Record<string, SortOrder> {
//     switch (sortBy) {
//       case SearchSortBy.NEWEST:       return { createdAt: -1 };
//       case SearchSortBy.PRICE_LOW:    return { price: 1 };
//       case SearchSortBy.PRICE_HIGH:   return { price: -1 };
//       case SearchSortBy.RATING:       return { averageRating: -1 };
//       case SearchSortBy.BEST_SELLING: return { soldCount: -1 };
//       case SearchSortBy.RELEVANCE:
//       default:
//         // For text queries: sort by text score; otherwise fall back to newest
//         return hasTextQuery ? { score: { $meta: 'textScore' } } : { createdAt: -1 };
//     }
//   }

//   /** Aggregation to compute sidebar facet data */
//   private async getFacets(
//     baseQuery: QueryFilter<any>,
//   ): Promise<{
//     priceRange: { min: number; max: number };
//     brands: { _id: string; name: string; count: number }[];
//     ratings: { rating: number; count: number }[];
//   }> {
//     const [priceAgg, brandAgg, ratingAgg] = await Promise.all([
//       // Min/max price across results
//       this.productModel.aggregate([
//         { $match: baseQuery },
//         { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
//       ]),

//       // Brand distribution
//       this.productModel.aggregate([
//         { $match: baseQuery },
//         { $group: { _id: '$brandId', count: { $sum: 1 } } },
//         { $sort: { count: -1 } },
//         { $limit: 20 },
//         {
//           $lookup: {
//             from: 'brands',
//             localField: '_id',
//             foreignField: '_id',
//             as: 'brand',
//           },
//         },
//         { $unwind: { path: '$brand', preserveNullAndEmpty: true } },
//         { $project: { _id: 1, name: '$brand.name', count: 1 } },
//       ]),

//       // Rating distribution (floor to nearest integer)
//       this.productModel.aggregate([
//         { $match: { ...baseQuery, averageRating: { $gt: 0 } } },
//         {
//           $group: {
//             _id: { $floor: '$averageRating' },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { _id: -1 } },
//         { $project: { rating: '$_id', count: 1, _id: 0 } },
//       ]),
//     ]);

//     return {
//       priceRange: priceAgg[0]
//         ? { min: priceAgg[0].min, max: priceAgg[0].max }
//         : { min: 0, max: 0 },
//       brands: brandAgg,
//       ratings: ratingAgg,
//     };
//   }

//   /** Fire-and-forget — save query to history + update popular searches */
//   private async persistSearchHistory(
//     dto: SearchDto,
//     userId: string | undefined,
//     resultsCount: number,
//   ): Promise<void> {
//     const q = dto.q!.trim();
//     const queryNorm = q.toLowerCase();

//     // Save user history (if logged in)
//     if (userId) {
//       await this.searchHistoryModel.create({
//         userId,
//         query: q,
//         queryNorm,
//         resultsCount,
//         appliedFilters: {
//           categoryId: dto.categoryId,
//           brandId: dto.brandId,
//           minPrice: dto.minPrice,
//           maxPrice: dto.maxPrice,
//           minRating: dto.minRating,
//           sortBy: dto.sortBy,
//         },
//       });
//     }

//     // Upsert popular searches leaderboard
//     await this.popularSearchModel.findOneAndUpdate(
//       { query: queryNorm },
//       { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
//       { upsert: true },
//     );
//   }
// }