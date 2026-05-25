import { Controller, Get, Param } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendation')
export class RecommendationController {

  constructor(
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get(':userId')
  async getRecommendations(
    @Param('userId') userId: string,
  ) {

    return await this.recommendationService.getRecommendations(userId);
  }
}