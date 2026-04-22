/**
 * Redis Health Indicator
 * Checks Redis connectivity
 */

import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicatorResult } from './database.indicator';

@Injectable()
export class RedisIndicator {
  private readonly logger = new Logger(RedisIndicator.name);

  constructor() {}

  /**
   * Check Redis connectivity
   */
  async check(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement Redis health check when RedisService is available
      // For now, return a degraded status indicating Redis is not configured
      const responseTime = Date.now() - startTime;

      this.logger.warn('Redis health check: service not configured');

      return {
        status: 'degraded',
        message: 'Redis connection not configured',
        responseTime,
        details: {
          message: 'Redis service not available',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(
        `Redis health check failed: ${error.message}`,
        error.stack,
      );

      return {
        status: 'down',
        message: `Redis connection failed: ${error.message}`,
        responseTime,
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
