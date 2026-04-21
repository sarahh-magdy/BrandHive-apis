import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '../../../models/order/order.schema';

export class GetOrdersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Filter orders from this date' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Filter orders to this date' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'ORD-20240115', description: 'Search by order number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sort field',
    enum: ['createdAt', 'total', 'status'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AdminGetOrdersDto extends GetOrdersDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (Admin only)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by seller ID (Admin only)' })
  @IsOptional()
  @IsString()
  sellerId?: string;
}