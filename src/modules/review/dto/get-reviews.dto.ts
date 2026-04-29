// import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
// import { Transform, Type } from 'class-transformer';
// import { ApiPropertyOptional } from '@nestjs/swagger';

// export enum ReviewSortBy {
//   NEWEST = 'newest',
//   OLDEST = 'oldest',
//   HIGHEST_RATING = 'highest_rating',
//   LOWEST_RATING = 'lowest_rating',
//   MOST_HELPFUL = 'most_helpful',
// }

// export class GetReviewsDto {
//   @ApiPropertyOptional({ default: 1 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   page?: number = 1;

//   @ApiPropertyOptional({ default: 10, maximum: 50 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @Max(50)
//   limit?: number = 10;

//   @ApiPropertyOptional({ enum: ReviewSortBy, default: ReviewSortBy.NEWEST })
//   @IsOptional()
//   @IsEnum(ReviewSortBy)
//   sortBy?: ReviewSortBy = ReviewSortBy.NEWEST;

//   @ApiPropertyOptional({ description: 'Filter by rating (1–5)', minimum: 1, maximum: 5 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt()
//   @Min(1)
//   @Max(5)
//   rating?: number;

//   @ApiPropertyOptional({ description: 'Show only verified purchase reviews' })
//   @IsOptional()
//   @Transform(({ value }) => value === 'true' || value === true)
//   @IsBoolean()
//   verifiedOnly?: boolean;
// }