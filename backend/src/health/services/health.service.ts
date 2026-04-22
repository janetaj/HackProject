/**
 * Health Service
 * Orchestrates health checks across all components
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseIndicator, HealthIndicatorResult } from '../indicators/database.indicator';
import { RedisIndicator } from '../indicators/redis.indicator';
// import { LLMIndicator } from '../indicators/llm.indicator'; // TODO: Enable when LLMModule is available

export interface HealthCheckResponse {
  status: 'up' | 'degraded' | 'down';
  timestamp: Date;
  uptime: number;
  checks: {
    database: HealthIndicatorResult;
    redis: HealthIndicatorResult;
  };
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    message: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private databaseIndicator: DatabaseIndicator,
    private redisIndicator: RedisIndicator,
    // private llmIndicator: LLMIndicator, // TODO: Enable when LLMModule is available
  ) {}

  /**
   * Liveness probe - checks if app is running
   */
  async getLiveness(): Promise<{
    status: 'alive' | 'dead';
    timestamp: Date;
    uptime: number;
  }> {
    return {
      status: 'alive',
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Readiness probe - checks if app is ready to serve traffic
   * Performs comprehensive health checks on all dependencies
   */
  async getReadiness(): Promise<HealthCheckResponse> {
    const startTime = Date.now();

    // Run all health checks in parallel
    const [database, redis] = await Promise.all([
      this.databaseIndicator.check(),
      this.redisIndicator.check(),
      // await this.llmIndicator.check(), // TODO: Enable when LLMModule is available
    ]);

    // Calculate summary
    const checks = { database, redis };
    const statuses = Object.values(checks).map((c) => c.status);

    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    statuses.forEach((status) => {
      if (status === 'up') {
        healthy++;
      } else if (status === 'degraded') {
        degraded++;
      } else {
        unhealthy++;
      }
    });

    // Determine overall status
    let overallStatus: 'up' | 'degraded' | 'down' = 'up';
    if (unhealthy > 0) {
      overallStatus = 'down';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    }

    // Generate message
    const message = this.generateStatusMessage(
      healthy,
      degraded,
      unhealthy,
    );

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      checks,
      summary: {
        healthy,
        degraded,
        unhealthy,
        message,
      },
    };

    this.logger.log(
      `Health check complete: ${message} (${Date.now() - startTime}ms)`,
    );

    return response;
  }

  /**
   * Generate human-readable status message
   */
  private generateStatusMessage(
    healthy: number,
    degraded: number,
    unhealthy: number,
  ): string {
    const total = healthy + degraded + unhealthy;

    if (unhealthy === 0 && degraded === 0) {
      return `All ${total} components healthy`;
    } else if (unhealthy === 0) {
      return `${healthy}/${total} components healthy, ${degraded} degraded`;
    } else {
      return `Only ${healthy}/${total} components healthy, ${degraded} degraded, ${unhealthy} down`;
    }
  }

  /**
   * Detailed health report (for debugging)
   */
  async getDetailedReport(): Promise<{
    overview: HealthCheckResponse;
    details: Record<string, any>;
  }> {
    const overview = await this.getReadiness();

    const details = {
      database: {
        status: overview.checks.database.status,
        responseTime: overview.checks.database.responseTime,
        message: overview.checks.database.message,
        ...overview.checks.database.details,
      },
      redis: {
        status: overview.checks.redis.status,
        responseTime: overview.checks.redis.responseTime,
        message: overview.checks.redis.message,
        ...overview.checks.redis.details,
      },
      // llm section disabled until LLMModule is available
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };

    return { overview, details };
  }
}
