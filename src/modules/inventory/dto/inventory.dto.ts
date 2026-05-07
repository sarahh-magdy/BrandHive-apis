import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsMongoId,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { StockChangeReason } from '../../../models/stock-log/stock-log.schema';

export class AdjustStockDto {
    @IsMongoId()
    @IsNotEmpty()
    productId: string;

    // positive = add, negative = deduct
    @IsInt()
    change: number;

    @IsEnum(StockChangeReason)
    reason: StockChangeReason;

    @IsOptional()
    @IsString()
    note?: string;
}

export class GetStockLogsDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @IsEnum(StockChangeReason)
    reason?: StockChangeReason;
}