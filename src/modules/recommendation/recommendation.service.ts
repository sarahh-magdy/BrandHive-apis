import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecommendationService {

  private readonly recommendationApi =
    process.env.RECOMMENDATION_API ||
    'http://YOUR_SERVER_IP:5000/api';

  async getRecommendations(userId: string) {
    try {

      const response = await axios.post(
        `${this.recommendationApi}/recommend`,
        {
          user_id: userId,
        },
      );

      return response.data;

    } catch (error) {

      console.log(error?.response?.data || error.message);

      throw new HttpException(
        'Recommendation service unavailable',
        500,
      );
    }
  }
}