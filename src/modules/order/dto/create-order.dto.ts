import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../models/order/order.schema';

export class ShippingAddressDto {
  @ApiProperty({ example: 'Ahmed Mohamed' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '01012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '10 El Nasr Street' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'Nasr City' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Cairo' })
  @IsString()
  governorate: string;

  @ApiPropertyOptional({ example: '11511' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Egypt', default: 'Egypt' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateOrderDto {
  /**
   * If not provided → use the user's saved default address from their profile.
   * Frontend can either pass a saved address ID or a full new address object.
   */
  @ApiPropertyOptional({ description: 'Saved address ID from user profile' })
  @IsOptional()
  @IsMongoId()
  savedAddressId?: string;

  @ApiPropertyOptional({ description: 'Inline address (overrides savedAddressId)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'SAVE10', description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'Please handle with care' })
  @IsOptional()
  @IsString()
  notes?: string;
}