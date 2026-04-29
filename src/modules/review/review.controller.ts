// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Query,
//   Req,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiParam,
//   ApiResponse,
//   ApiTags,
// } from '@nestjs/swagger';
// import { ReviewService } from './review.service';
// import { AdminReplyDto, CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
// import { GetReviewsDto } from './dto/get-reviews.dto';
// import { PaginatedReviewsEntity, ReviewEntity } from './entities/review.entity';

// @ApiTags('Reviews')
// @ApiBearerAuth()
// @Controller('reviews')
// export class ReviewController {
//   constructor(private readonly reviewService: ReviewService) {}

//   // ── User endpoints ──────────────────────────────────────────

//   /**
//    * POST /reviews
//    * Add review (verified purchase only)
//    */
//   @Post()
//   @ApiOperation({ summary: 'Add a review (verified purchase only)' })
//   @ApiResponse({ status: 201, type: ReviewEntity })
//   async createReview(@Req() req: any, @Body() dto: CreateReviewDto) {
//     return this.reviewService.createReview(
//       req.user._id,
//       dto,
//     );
//   }

//   /**
//    * GET /reviews/product/:productId
//    * Get all visible reviews for a product (public)
//    */
//   @Get('product/:productId')
//   @ApiOperation({ summary: 'Get reviews for a product' })
//   @ApiParam({ name: 'productId' })
//   @ApiResponse({ status: 200, type: PaginatedReviewsEntity })
//   async getProductReviews(
//     @Param('productId') productId: string,
//     @Query() dto: GetReviewsDto,
//   ) {
//     return this.reviewService.getProductReviews(productId, dto);
//   }

//   /**
//    * GET /reviews/product/:productId/stats
//    * Rating stats only (for product page sidebar)
//    */
//   @Get('product/:productId/stats')
//   @ApiOperation({ summary: 'Get rating stats for a product' })
//   async getProductRatingStats(@Param('productId') productId: string) {
//     return this.reviewService.getProductRatingStats(productId);
//   }

//   /**
//    * GET /reviews/my
//    * Get current user's reviews
//    */
//   @Get('my')
//   @ApiOperation({ summary: 'Get my reviews' })
//   async getMyReviews(@Req() req: any, @Query() dto: GetReviewsDto) {
//     return this.reviewService.getMyReviews(req.user._id, dto);
//   }

//   /**
//    * GET /reviews/:id
//    * Get single review by ID
//    */
//   @Get(':id')
//   @ApiOperation({ summary: 'Get review by ID' })
//   @ApiResponse({ status: 200, type: ReviewEntity })
//   async getReview(@Param('id') id: string) {
//     return this.reviewService.getReviewById(id);
//   }

//   /**
//    * PATCH /reviews/:id
//    * Update own review
//    */
//   @Patch(':id')
//   @ApiOperation({ summary: 'Update my review' })
//   @ApiResponse({ status: 200, type: ReviewEntity })
//   async updateReview(
//     @Req() req: any,
//     @Param('id') id: string,
//     @Body() dto: UpdateReviewDto,
//   ) {
// return this.reviewService.updateReview(
//   id,
//   req.user._id,
//   dto,
// );  }

//   /**
//    * DELETE /reviews/:id
//    * Soft delete own review
//    */
//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete my review' })
//   async deleteReview(@Req() req: any, @Param('id') id: string) {
// return this.reviewService.deleteReview(
//   id,
//   req.user._id,
//   false,
// );  }

//   /**
//    * PATCH /reviews/:id/helpful
//    * Toggle helpful vote
//    */
//   @Patch(':id/helpful')
//   @ApiOperation({ summary: 'Toggle helpful vote on a review' })
//   async toggleHelpful(@Req() req: any, @Param('id') id: string) {
//     return this.reviewService.toggleHelpfulVote(id, req.user._id);
//   }

//   // ── Admin endpoints ─────────────────────────────────────────

//   /**
//    * GET /reviews/admin/all
//    * Admin: list all reviews with filters
//    */
//   @Get('admin/all')
//   @ApiOperation({ summary: '[Admin] Get all reviews' })
//   async adminGetAllReviews(@Query() dto: GetReviewsDto) {
//     return this.reviewService.adminGetAllReviews(dto);
//   }

//   /**
//    * PATCH /reviews/admin/:id/visibility
//    * Admin: show/hide a review
//    */
//   @Patch('admin/:id/visibility')
//   @ApiOperation({ summary: '[Admin] Toggle review visibility' })
//   async toggleVisibility(@Param('id') id: string) {
//     return this.reviewService.toggleVisibility(id);
//   }

//   /**
//    * PATCH /reviews/admin/:id/reply
//    * Admin: reply to a review
//    */
//   @Patch('admin/:id/reply')
//   @ApiOperation({ summary: '[Admin] Reply to a review' })
//   @ApiResponse({ status: 200, type: ReviewEntity })
//   async adminReply(@Param('id') id: string, @Body() dto: AdminReplyDto) {
//     return this.reviewService.adminReply(id, dto);
//   }

//   /**
//    * DELETE /reviews/admin/:id
//    * Admin: force delete any review
//    */
//   @Delete('admin/:id')
//   @ApiOperation({ summary: '[Admin] Delete any review' })
//   async adminDeleteReview(@Req() req: any, @Param('id') id: string) {
// return this.reviewService.deleteReview(
//   id,
//   req.user._id,
//   true,
// );  }
// }