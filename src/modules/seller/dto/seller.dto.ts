import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsMongoId,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OrderStatus } from '../../../models/order/order.schema';

// ─── Product DTOs ─────────────────────────────────────────────────

class DimensionsDto {
    @Type(() => Number) @IsNumber() @Min(0) length: number;
    @Type(() => Number) @IsNumber() @Min(0) width: number;
    @Type(() => Number) @IsNumber() @Min(0) height: number;
}

export class SellerCreateProductDto {
    @IsString() @IsNotEmpty() @MinLength(2) name: string;
    @IsOptional() @IsString() description?: string;
    @Type(() => Number) @IsNumber() @Min(0) price: number;
    @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountPrice?: number;
    @Type(() => Number) @IsNumber() @Min(0) stock: number;
    @IsMongoId() category: string;
    @IsMongoId() brand: string;
    @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
    @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weight?: number;
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

// ─── Order DTOs ───────────────────────────────────────────────────

export class GetSellerOrdersDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 10;
    @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
    @IsOptional() @IsString() dateFrom?: string;
    @IsOptional() @IsString() dateTo?: string;
}

// ─── Analytics DTOs ───────────────────────────────────────────────

export enum SellerAnalyticsPeriod {
    WEEK = 'week',
    MONTH = 'month',
    YEAR = 'year',
}

export class SellerAnalyticsDto {
    @IsOptional() @IsEnum(SellerAnalyticsPeriod)
    period?: SellerAnalyticsPeriod = SellerAnalyticsPeriod.MONTH;
}

// ─── Bazaar DTOs ──────────────────────────────────────────────────

export class UpdateBazaarDto {
    @IsOptional() @IsString() @MinLength(2) storeName?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() whatsappLink?: string;
    @IsOptional() @IsString() website?: string;
    @IsOptional() @IsArray() @IsMongoId({ each: true }) featuredCategories?: string[];
}

export class CreateBazaarDto {
    @IsString() @IsNotEmpty() @MinLength(2) storeName: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() whatsappLink?: string;
    @IsOptional() @IsString() website?: string;
    @IsOptional() @IsArray() @IsMongoId({ each: true }) featuredCategories?: string[];
}

export class AdminCreateBazaarDto extends CreateBazaarDto {
    @IsMongoId() sellerId: string;
}

export class ReviewBazaarDto {
    @IsEnum(['approved', 'rejected']) status: 'approved' | 'rejected';
    @IsOptional() @IsString() rejectionReason?: string;
}