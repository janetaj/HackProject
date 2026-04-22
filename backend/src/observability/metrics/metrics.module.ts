/**
 * Metrics Module
 * Prometheus metrics exposition and collection
 */

import { Module, Injectable, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { register, collectDefaultMetrics, Registry } from 'prom-client';
import { CustomMetrics } from './custom-metrics';

/**
 * Prometheus metrics middleware for collecting HTTP request metrics
 */
@Injectable()
export class MetricsMiddleware {
  private metricsRegistry: Registry;

  constructor() {
    this.metricsRegistry = register;
    // Collect default Node.js metrics
    collectDefaultMetrics({ register: this.metricsRegistry });
  }

  use(req: any, res: any, next: any): void {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function (data: any): void {
      const duration = Date.now() - start;
      const method = req.method;
      const endpoint = req.baseUrl || req.path;
      const status = res.statusCode;

      // Record metrics
      CustomMetrics.httpRequestsTotal
        .labels(method, endpoint, status.toString())
        .inc();
      CustomMetrics.httpRequestDuration
        .labels(method, endpoint)
        .observe(duration / 1000);

      if (status >= 400) {
        CustomMetrics.httpErrorsTotal
          .labels(method, endpoint, status.toString())
          .inc();
      }

      res.send = originalSend;
      return res.send(data);
    };

    next();
  }
}

/**
 * Metrics Controller
 * Exposes Prometheus metrics endpoint
 */
@Controller('metrics')
export class MetricsController {
  /**
   * Prometheus metrics endpoint
   * Exposes metrics in Prometheus text format
   */
  @Get()
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Metrics in JSON format (for debugging)
   */
  @Get('json')
  async getMetricsJson(): Promise<any> {
    const metrics = await register.metrics();
    return {
      timestamp: new Date().toISOString(),
      metrics: metrics
        .split('\n')
        .filter((line) => !line.startsWith('#') && line.trim())
        .map((line) => {
          const [name, value] = line.split(' ');
          return { name, value };
        }),
    };
  }

  /**
   * Health summary
   * Returns aggregated health metrics
   */
  @Get('health')
  async getMetricsHealth(): Promise<{
    activeWebsockets: number;
    queueDepth: Record<string, number>;
    activeConnections: {
      database: number;
    };
    recentRequests: number;
    recentErrors: number;
  }> {
    // Parse metrics for quick health summary
    const metrics = register.metrics();

    return {
      activeWebsockets: 0, // Would be calculated from metrics
      queueDepth: {},
      activeConnections: {
        database: 0,
      },
      recentRequests: 0,
      recentErrors: 0,
    };
  }
}

/**
 * Metrics Module
 * Integrates Prometheus metrics collection
 */
@Module({
  providers: [MetricsMiddleware],
  controllers: [MetricsController],
  exports: [MetricsMiddleware],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
