import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBrandStatsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalProducts?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalReviews?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalSales?: number;
}