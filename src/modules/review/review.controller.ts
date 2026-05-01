import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, GetReviewsDto } from './dto/review.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('reviews')
@UseGuards(AuthGuard, RolesGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ────────────────────────────────────────────────────────────────
  // Customer
  // ────────────────────────────────────────────────────────────────

  // POST /reviews
  @Post()
  @Auth(['Customer'])
  createReview(@User() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(user._id, dto);
  }

  // GET /reviews/my-reviews
  @Get('my-reviews')
  @Auth(['Customer'])
  getMyReviews(@User() user: any, @Query() query: GetReviewsDto) {
    return this.reviewService.getMyReviews(user._id, query);
  }

  // DELETE /reviews/:id
  @Delete(':id')
  @Auth(['Customer'])
  deleteMyReview(@Param('id') id: string, @User() user: any) {
    return this.reviewService.deleteReview(id, user._id, 'Customer');
  }

  // ────────────────────────────────────────────────────────────────
  // Public (no auth needed to view reviews)
  // ────────────────────────────────────────────────────────────────

  // GET /reviews/product/:productId
  @Get('product/:productId')
  @Auth(['Customer', 'Seller', 'Admin'])
  getProductReviews(
    @Param('productId') productId: string,
    @Query() query: GetReviewsDto,
  ) {
    return this.reviewService.getProductReviews(productId, query);
  }

  // ────────────────────────────────────────────────────────────────
  // Admin
  // ────────────────────────────────────────────────────────────────

  // DELETE /reviews/admin/:id
  @Delete('admin/:id')
  @Auth(['Admin'])
  adminDeleteReview(@Param('id') id: string, @User() user: any) {
    return this.reviewService.deleteReview(id, user._id, 'Admin');
  }

  // PATCH /reviews/admin/:id/toggle
  @Patch('admin/:id/toggle')
  @Auth(['Admin'])
  toggleVisibility(@Param('id') id: string) {
    return this.reviewService.toggleVisibility(id);
  }
}