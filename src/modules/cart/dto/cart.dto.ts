import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  // ─── quantity = 0 → remove item ───────────────────────────────
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class ApplyCouponDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string;
}