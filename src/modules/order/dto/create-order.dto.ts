// ─── create-order.dto.ts ──────────────────────────────────────────
import { Type } from 'class-transformer';
import {
  IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../models/order/order.schema';

export class ShippingAddressDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() street: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() governorate: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional() @IsString()
  notes?: string;
}