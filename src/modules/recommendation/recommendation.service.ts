import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly recommendationApi =
    process.env.RECOMMENDATION_API || 'http://YOUR_SERVER_IP:5000/api';

  constructor(private readonly httpService: HttpService) {}

  async getRecommendations(userId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<any>(`${this.recommendationApi}/recommend`, {
          user_id: userId,
        }),
      );
      return data;
    } catch (error) {
      this.logger.error(
        `Recommendation failed for user ${userId}`,
        error?.response?.data || error.message,
      );
      throw new HttpException(
        'Recommendation service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}