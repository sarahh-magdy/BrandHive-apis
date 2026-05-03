import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
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
  // ─── Option A: Use saved address ──────────────────────────────
  @IsOptional()
  @IsMongoId()
  addressId?: string;

  // ─── Option B: Provide address inline ─────────────────────────
  // لو addressId مش موجود → shippingAddress مطلوب
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  // ─── Coupon code (validated against DB) ───────────────────────
  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}