import {
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReviewImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/review-img.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'Product front view' })
  @IsOptional()
  @IsString()
  alt?: string;
}

export class CreateReviewDto {
  @ApiProperty({ example: '64abc123...' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great product, highly recommend!', minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment: string;

  @ApiPropertyOptional({ example: 'Excellent quality' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ type: [ReviewImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewImageDto)
  images?: ReviewImageDto[];
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated review text' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({ example: 'Updated title' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ type: [ReviewImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewImageDto)
  images?: ReviewImageDto[];
}

export class AdminReplyDto {
  @ApiProperty({ example: 'Thank you for your feedback!' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reply: string;
}