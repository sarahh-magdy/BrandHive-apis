import { Controller, Get, Param } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { User } from '@common/decorators/user.decorator';
import { Public } from '@common/decorators/public.decorator';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  // Personal recommendations للـ user المسجل
  @Get()
  async getRecommendations(@User() user: any) {
    return this.recommendationService.getRecommendations(user._id.toString());
  }

  // Similar products لأي product (public)
  @Public()
  @Get('similar/:productId')
  async getSimilarProducts(@Param('productId') productId: string) {
    return this.recommendationService.getSimilarProducts(productId);
  }

  // Trending products (public)
  @Public()
  @Get('trending')
  async getTrending() {
    return this.recommendationService.getTrending([], 12);
  }
}