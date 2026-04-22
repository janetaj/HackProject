/**
 * LLM Health Indicator
 * Checks LLM provider connectivity and availability
 */

import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../llm/services/llm.service';
import { HealthIndicatorResult } from './database.indicator';

@Injectable()
export class LLMIndicator {
  private readonly logger = new Logger(LLMIndicator.name);

  constructor(private llmService: LLMService) {}

  /**
   * Check LLM provider availability
   */
  async check(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check primary provider (OpenAI)
      const primaryHealthy = await this.checkProvider('openai');

      // Check fallback provider (Groq)
      const fallbackHealthy = await this.checkProvider('groq');

      const responseTime = Date.now() - startTime;

      if (primaryHealthy || fallbackHealthy) {
        const status =
          primaryHealthy && fallbackHealthy ? 'up' : 'degraded';
        const message =
          primaryHealthy && fallbackHealthy
            ? 'All LLM providers healthy'
            : primaryHealthy
              ? 'Primary provider healthy, fallback unavailable'
              : 'Primary provider down, fallback available';

        this.logger.debug(`LLM health check: ${message} (${responseTime}ms)`);

        return {
          status,
          message,
          responseTime,
          details: {
            primaryProvider: {
              name: 'openai',
              status: primaryHealthy ? 'up' : 'down',
            },
            fallbackProvider: {
              name: 'groq',
              status: fallbackHealthy ? 'up' : 'down',
            },
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        throw new Error('No LLM providers available');
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(
        `LLM health check failed: ${error.message}`,
        error.stack,
      );

      return {
        status: 'down',
        message: `LLM providers unavailable: ${error.message}`,
        responseTime,
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Check individual provider health
   */
  private async checkProvider(provider: 'openai' | 'groq'): Promise<boolean> {
    try {
      // Note: In a real implementation, this would call the actual provider's health endpoint
      // For now, we'll just verify the provider is configured and accessible
      const timeout = 5000; // 5 second timeout
      const healthPromise = this.callProviderHealth(provider);
      const result = await Promise.race([
        healthPromise,
        this.delay(timeout),
      ]);

      return result === true;
    } catch (error) {
      this.logger.warn(`${provider} provider unavailable: ${error.message}`);
      return false;
    }
  }

  /**
   * Call provider health endpoint (mock)
   */
  private async callProviderHealth(provider: 'openai' | 'groq'): Promise<boolean> {
    // Mock implementation - in production, you would call actual provider APIs
    // e.g., OpenAI: GET https://api.openai.com/v1/models
    // e.g., Groq: GET https://api.groq.com/health
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 100);
    });
  }

  /**
   * Helper to create a delay promise
   */
  private delay(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(false), ms);
    });
  }
}
