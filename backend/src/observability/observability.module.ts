/**
 * Observability Module
 * Integrates logging, tracing, and metrics
 */

import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { TracingProvider } from './tracing/tracing.provider';

/**
 * Global observability module
 * Provides structured logging, distributed tracing, and Prometheus metrics
 */
@Module({
  imports: [MetricsModule],
  providers: [TracingProvider],
  exports: [TracingProvider, MetricsModule],
})
export class ObservabilityModule {
  constructor(private tracingProvider: TracingProvider) {
    this.initializeObservability();
  }

  /**
   * Initialize all observability components on module startup
   */
  private async initializeObservability(): Promise<void> {
    console.log('Initializing observability layer...');

    try {
      // Start distributed tracing
      await this.tracingProvider.start();

      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  Observability Initialized                     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  📊 Prometheus Metrics:      GET /metrics                      ║
║  📊 Metrics (JSON):          GET /metrics/json                 ║
║  📊 Metrics Health:          GET /metrics/health               ║
║                                                                ║
║  🔍 Structured Logging:      Pino JSON logger                  ║
║  🔍 Correlation IDs:         W3C Trace Context                 ║
║  🔍 Log Level:               ${process.env.LOG_LEVEL || 'debug'} ║
║                                                                ║
║  🎯 Distributed Tracing:     OpenTelemetry                     ║
║  🎯 Trace Exporter:          ${process.env.NODE_ENV === 'production' ? 'Jaeger' : 'Console'} ║
║                                                                ║
║  📈 Custom Metrics:                                            ║
║   • LLM API calls (cost, tokens, duration)                    ║
║   • Test case generation (queue, duration, status)            ║
║   • Jira polling (frequency, ticket detection)                ║
║   • Export operations (format, file size, record count)       ║
║   • WebSocket connections (active sessions)                   ║
║   • HTTP requests (latency, errors by endpoint)               ║
║   • Database queries (latency, errors)                        ║
║   • Job queue depth and processing metrics                    ║
║   • System health (uptime, memory, CPU)                       ║
║   • User activity and budget tracking                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);
    } catch (error) {
      console.error('Failed to initialize observability:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of observability components
   */
  async onModuleDestroy(): Promise<void> {
    console.log('Shutting down observability layer...');
    try {
      await this.tracingProvider.stop();
      console.log('✓ Observability shutdown complete');
    } catch (error) {
      console.error('Error during observability shutdown:', error);
    }
  }
}

/**
 * Export commonly used observability utilities
 */
export { Logger } from './logging/logger';
export { TracingProvider, extractTraceContext, formatTraceContext } from './tracing/tracing.provider';
export { CustomMetrics, recordHttpMetrics, recordDatabaseMetrics, recordLLMMetrics, recordGenerationMetrics } from './metrics/custom-metrics';
