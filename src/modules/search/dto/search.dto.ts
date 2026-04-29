// import {
//   IsArray,
//   IsEnum,
//   IsInt,
//   IsMongoId,
//   IsNumber,
//   IsOptional,
//   IsString,
//   Max,
//   Min,
// } from 'class-validator';
// import { Transform, Type } from 'class-transformer';
// import { ApiPropertyOptional } from '@nestjs/swagger';

// export enum SearchSortBy {
//   RELEVANCE = 'relevance',
//   NEWEST = 'newest',
//   PRICE_LOW = 'price_low',
//   PRICE_HIGH = 'price_high',
//   RATING = 'rating',
//   BEST_SELLING = 'best_selling',
// }

// export class SearchDto {
//   // ── Core query ─────────────────────────────────────────────

//   @ApiPropertyOptional({ example: 'wireless headphones', description: 'Text search query' })
//   @IsOptional()
//   @IsString()
//   q?: string;

//   // ── Category / Brand ────────────────────────────────────────

//   @ApiPropertyOptional({ description: 'Filter by category ID' })
//   @IsOptional()
//   @IsMongoId()
//   categoryId?: string;

//   @ApiPropertyOptional({ description: 'Filter by brand ID' })
//   @IsOptional()
//   @IsMongoId()
//   brandId?: string;

//   @ApiPropertyOptional({
//     description: 'Filter by multiple brand IDs (comma-separated)',
//     example: '64abc,64def',
//   })
//   @IsOptional()
//   @Transform(({ value }) =>
//     typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : value,
//   )
//   @IsArray()
//   @IsMongoId({ each: true })
//   brandIds?: string[];

//   // ── Price range ──────────────────────────────────────────────

//   @ApiPropertyOptional({ example: 100, description: 'Min price (EGP)' })
//   @IsOptional()
//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   minPrice?: number;

//   @ApiPropertyOptional({ example: 5000, description: 'Max price (EGP)' })
//   @IsOptional()
//   @Type(() => Number)
//   @IsNumber()
//   @Min(0)
//   maxPrice?: number;

//   // ── Rating ───────────────────────────────────────────────────

//   @ApiPropertyOptional({ example: 4, description: 'Minimum average rating' })
//   @IsOptional()
//   @Type(() => Number)
//   @IsNumber()
//   @Min(1)
//   @Max(5)
//   minRating?: number;

//   // ── Stock ────────────────────────────────────────────────────

//   @ApiPropertyOptional({ description: 'Show only in-stock products' })
//   @IsOptional()
//   @Transform(({ value }) => value === 'true' || value === true)
//   inStockOnly?: boolean;

//   // ── Sorting ──────────────────────────────────────────────────

//   @ApiPropertyOptional({ enum: SearchSortBy, default: SearchSortBy.RELEVANCE })
//   @IsOptional()
//   @IsEnum(SearchSortBy)
//   sortBy?: SearchSortBy = SearchSortBy.RELEVANCE;

//   // ── Pagination ───────────────────────────────────────────────

//   @ApiPropertyOptional({ default: 1 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   page?: number = 1;

//   @ApiPropertyOptional({ default: 20, maximum: 100 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @Max(100)
//   limit?: number = 20;
// }

// export class AutocompleteDto {
//   @ApiPropertyOptional({ example: 'wire', description: 'Partial query for suggestions' })
//   @IsString()
//   q: string;
// }