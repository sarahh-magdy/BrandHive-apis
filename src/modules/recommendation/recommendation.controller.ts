import { Controller, Get } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { User } from '@common/decorators/user.decorator';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get()
  async getRecommendations(@User() user: any) {
    return this.recommendationService.getRecommendations(user._id.toString());
  }
}