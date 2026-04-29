// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// export class ReviewImageEntity {
//   @ApiProperty() url: string;
//   @ApiPropertyOptional() alt?: string;
// }

// export class ReviewUserEntity {
//   @ApiProperty() _id: string;
//   @ApiProperty() name: string;
//   @ApiPropertyOptional() avatar?: string;
// }

// export class ReviewEntity {
//   @ApiProperty() _id: string;
//   @ApiProperty() productId: string;
//   @ApiProperty({ type: ReviewUserEntity }) userId: ReviewUserEntity;
//   @ApiPropertyOptional() orderId?: string;
//   @ApiProperty() isVerifiedPurchase: boolean;
//   @ApiProperty({ minimum: 1, maximum: 5 }) rating: number;
//   @ApiProperty() comment: string;
//   @ApiPropertyOptional() title?: string;
//   @ApiPropertyOptional({ type: [ReviewImageEntity] }) images?: ReviewImageEntity[];
//   @ApiProperty() helpfulCount: number;
//   @ApiPropertyOptional() adminReply?: string;
//   @ApiPropertyOptional() adminRepliedAt?: Date;
//   @ApiProperty() createdAt: Date;
//   @ApiProperty() updatedAt: Date;
// }

// export class RatingDistributionEntity {
//   @ApiProperty() 1: number;
//   @ApiProperty() 2: number;
//   @ApiProperty() 3: number;
//   @ApiProperty() 4: number;
//   @ApiProperty() 5: number;
// }

// export class RatingStatsEntity {
//   @ApiProperty({ example: 4.3 }) averageRating: number;
//   @ApiProperty() totalReviews: number;
//   @ApiProperty({ type: RatingDistributionEntity }) distribution: RatingDistributionEntity;
// }

// export class PaginatedReviewsEntity {
//   @ApiProperty({ type: [ReviewEntity] }) data: ReviewEntity[];
//   @ApiProperty() total: number;
//   @ApiProperty() page: number;
//   @ApiProperty() limit: number;
//   @ApiProperty() totalPages: number;
//   @ApiProperty({ type: RatingStatsEntity }) stats: RatingStatsEntity;
// }