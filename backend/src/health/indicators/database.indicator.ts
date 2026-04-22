/**
 * Database Health Indicator
 * Checks PostgreSQL connectivity
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthIndicatorResult {
  status: 'up' | 'down' | 'degraded';
  message: string;
  responseTime: number;
  details?: Record<string, any>;
}

@Injectable()
export class DatabaseIndicator {
  private readonly logger = new Logger(DatabaseIndicator.name);

  constructor(private dataSource: DataSource) {}

  /**
   * Check database connectivity
   */
  async check(): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Try to execute a simple query
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      this.logger.debug(`Database health check passed (${responseTime}ms)`);

      return {
        status: 'up',
        message: 'Database connection healthy',
        responseTime,
        details: {
          driver: this.dataSource.driver.constructor.name,
          database: this.dataSource.driver.database,
          isInitialized: this.dataSource.isInitialized,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(
        `Database health check failed: ${error.message}`,
        error.stack,
      );

      return {
        status: 'down',
        message: `Database connection failed: ${error.message}`,
        responseTime,
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}
