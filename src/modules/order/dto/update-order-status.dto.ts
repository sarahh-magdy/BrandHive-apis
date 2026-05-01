import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { OrderStatus } from '../../../models/order/order.schema';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional() @IsString()
  note?: string;
}

export class CancelOrderDto {
  @IsString() @MinLength(5)
  reason: string;
}