import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DimensionsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // 🔥 IMPORTANT FIX
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  // 🔥 IMPORTANT FIX
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @IsMongoId()
  category: string;

  @IsMongoId()
  brand: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  // nested object fix
  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;
}