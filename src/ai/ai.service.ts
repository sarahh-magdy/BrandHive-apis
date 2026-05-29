import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
private readonly aiBaseUrl: string;

constructor(private configService: ConfigService) {
  this.aiBaseUrl = this.configService.get<string>('AI_BASE_URL') ?? '';
}
  // Category-based recommendations
  async getRecommendations(categories: string[]) {
    const res = await fetch(`${this.aiBaseUrl}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    });
    if (!res.ok) throw new HttpException('AI service error', res.status);
    return res.json();
  }

  // Similar products
  async getSimilarProducts(productId: string) {
    const res = await fetch(`${this.aiBaseUrl}/api/similar/${productId}`);
    if (!res.ok) throw new HttpException('AI service error', res.status);
    return res.json();
  }

  // Behavioral recommendations
  async getBehavioralRecommendations(interactions: any) {
    const res = await fetch(`${this.aiBaseUrl}/api/behavioral/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interactions),
    });
    if (!res.ok) throw new HttpException('AI service error', res.status);
    return res.json();
  }

  // Track user event
  async trackEvent(eventData: any) {
    const res = await fetch(`${this.aiBaseUrl}/api/behavioral/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new HttpException('AI service error', res.status);
    return res.json();
  }

  // Trending products
  async getTrending(category?: string) {
    const url = category
      ? `${this.aiBaseUrl}/api/trending?category=${category}`
      : `${this.aiBaseUrl}/api/trending`;
    const res = await fetch(url);
    if (!res.ok) throw new HttpException('AI service error', res.status);
    return res.json();
  }
}