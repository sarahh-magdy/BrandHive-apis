// ─── seller-product.dto.ts ────────────────────────────────────────
import { Type } from 'class-transformer';
import {
    IsArray, IsBoolean, IsInt, IsMongoId, IsNotEmpty,
    IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

class DimensionsDto {
    @IsNumber() @Min(0) length: number;
    @IsNumber() @Min(0) width: number;
    @IsNumber() @Min(0) height: number;
}

export class SellerCreateProductDto {
    @IsString() @IsNotEmpty() @MinLength(2) name: string;
    @IsOptional() @IsString() description?: string;
    @IsNumber() @Min(0) price: number;
    @IsOptional() @IsNumber() @Min(0) discountPrice?: number;
    @IsNumber() @Min(0) stock: number;
    @IsMongoId() category: string;
    @IsMongoId() brand: string;
    @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
    @IsOptional() @IsNumber() @Min(0) weight?: number;
    @IsOptional() @ValidateNested() @Type(() => DimensionsDto) dimensions?: DimensionsDto;
}

export class SellerUpdateProductDto extends PartialType(SellerCreateProductDto) { }

export class GetSellerProductsDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 10;
    @IsOptional() @IsString() search?: string;
    @IsOptional() @IsMongoId() category?: string;
    @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
    @IsOptional() @Type(() => Boolean) @IsBoolean() lowStock?: boolean;
}

// ─── seller-order.dto.ts ──────────────────────────────────────────
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../models/order/order.schema';

export class GetSellerOrdersDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 10;
    @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
    @IsOptional() @IsString() dateFrom?: string;
    @IsOptional() @IsString() dateTo?: string;
}

// ─── seller-analytics.dto.ts ──────────────────────────────────────
export enum SellerAnalyticsPeriod {
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year',
}

export class SellerAnalyticsDto {
    @IsOptional() @IsEnum(SellerAnalyticsPeriod)
    period?: SellerAnalyticsPeriod = SellerAnalyticsPeriod.MONTH;
}

// ─── bazaar.dto.ts ────────────────────────────────────────────────
export class UpdateBazaarDto {
    @IsOptional() @IsString() @MinLength(2) storeName?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() whatsappLink?: string;
    @IsOptional() @IsString() website?: string;
    @IsOptional() @IsArray() @IsMongoId({ each: true }) featuredCategories?: string[];
}