import {
  IsMongoId,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ArrayNotEmpty,
} from 'class-validator';

export class AddToWishlistDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;
}

export class MoveToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;
}

export class MoveAllToCartDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  productIds?: string[];
}