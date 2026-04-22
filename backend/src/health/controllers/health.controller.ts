/**
 * Health Controller
 * K8s-compatible health check endpoints
 */

import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResponse } from '../services/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private healthService: HealthService) {}

  /**
   * GET /health
   * Full system health check (DB, Redis, LLM providers)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Full system health check (DB, Redis, LLM providers)' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are unhealthy' })
  async liveness() {
    try {
      const result = await this.healthService.getLiveness();
      return {
        status: result.status,
        message: 'Service is alive',
        timestamp: result.timestamp,
        uptime: Math.floor(result.uptime / 1000),
      };
    } catch (error) {
      this.logger.error(`Liveness probe failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/v1/health/live
   * Liveness probe
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessProbe() {
    return { status: 'up', timestamp: new Date() };
  }

  /**
   * GET /api/v1/health/ready
   * Readiness probe (checks database)
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks database)' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  async readiness(): Promise<HealthCheckResponse & { httpStatus: number }> {
    try {
      const result = await this.healthService.getReadiness();
      const httpStatus =
        result.status === 'up'
          ? HttpStatus.OK
          : result.status === 'degraded'
            ? HttpStatus.PARTIAL_CONTENT
            : HttpStatus.SERVICE_UNAVAILABLE;
      return { ...result, httpStatus };
    } catch (error) {
      this.logger.error(`Readiness probe failed: ${error.message}`);
      return {
        status: 'down',
        timestamp: new Date(),
        uptime: 0,
        checks: {
          database: { status: 'down', message: 'Unknown', responseTime: 0 },
          redis: { status: 'down', message: 'Unknown', responseTime: 0 },
          llm: { status: 'down', message: 'Unknown', responseTime: 0 },
        },
        summary: { healthy: 0, degraded: 0, unhealthy: 3, message: 'Health check failed' },
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
      } as any;
    }
  }

  /**
   * GET /health/report
   * Detailed health report
   */
  @Get('report')
  @ApiOperation({ summary: 'Detailed health report for all components' })
  @ApiResponse({ status: 200, description: 'Detailed health report' })
  async getDetailedReport() {
    try {
      return await this.healthService.getDetailedReport();
    } catch (error) {
      this.logger.error(`Detailed report failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /health/db
   */
  @Get('db')
  @ApiOperation({ summary: 'Database health check' })
  @ApiResponse({ status: 200, description: 'Database health status' })
  async checkDatabase() {
    try {
      const report = await this.healthService.getDetailedReport();
      return {
        component: 'database',
        status: report.overview.checks.database.status,
        message: report.overview.checks.database.message,
        responseTime: report.overview.checks.database.responseTime,
        details: report.details.database,
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /health/cache
   */
  @Get('cache')
  @ApiOperation({ summary: 'Redis / cache health check' })
  @ApiResponse({ status: 200, description: 'Redis health status' })
  async checkCache() {
    try {
      const report = await this.healthService.getDetailedReport();
      return {
        component: 'redis',
        status: report.overview.checks.redis.status,
        message: report.overview.checks.redis.message,
        responseTime: report.overview.checks.redis.responseTime,
        details: report.details.redis,
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      throw error;
    }
  }
}
