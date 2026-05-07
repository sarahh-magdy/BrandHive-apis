import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export enum SortBy {
    NEWEST = 'newest',
    PRICE_ASC = 'price_asc',
    PRICE_DESC = 'price_desc',
    RATING = 'rating',
    BEST_SELLING = 'best_selling',
    RELEVANCE = 'relevance',
}

export class SearchProductsDto {
    // ─── Pagination ───────────────────────────────────────────────
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 12;

    // ─── Search ───────────────────────────────────────────────────
    @IsOptional()
    @IsString()
    search?: string;

    // ─── Filters ──────────────────────────────────────────────────
    @IsOptional()
    @IsMongoId()
    category?: string;

    // single or multiple brands: brand=id1,id2
    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(5)
    minRating?: number;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    inStock?: boolean;

    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    onSale?: boolean;

    // ─── Sorting ──────────────────────────────────────────────────
    @IsOptional()
    @IsEnum(SortBy)
    sortBy?: SortBy = SortBy.NEWEST;

    // ─── Facets (return sidebar filters data) ─────────────────────
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    withFacets?: boolean = false;
}