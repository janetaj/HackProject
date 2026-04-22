/**
 * Custom Metrics Definitions
 * Application-specific metrics for Prometheus
 */

import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Custom metrics for the application
 */
export class CustomMetrics {
  /**
   * LLM API Call Metrics
   */
  static llmApiCalls = new Counter({
    name: 'llm_api_calls_total',
    help: 'Total number of LLM API calls',
    labelNames: ['provider', 'model', 'status'],
  });

  static llmTokensUsed = new Counter({
    name: 'llm_tokens_used_total',
    help: 'Total tokens consumed from LLM providers',
    labelNames: ['provider', 'token_type'],
  });

  static llmApiDuration = new Histogram({
    name: 'llm_api_duration_seconds',
    help: 'Duration of LLM API calls in seconds',
    labelNames: ['provider', 'model'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  static llmCostEur = new Counter({
    name: 'llm_cost_eur_total',
    help: 'Total cost of LLM API calls in EUR',
    labelNames: ['provider', 'user_role'],
  });

  static llmBudgetExhausted = new Counter({
    name: 'llm_budget_exhausted_total',
    help: 'Number of times LLM budget was exhausted',
    labelNames: ['user_role'],
  });

  /**
   * Test Case Generation Metrics
   */
  static generationJobsQueued = new Counter({
    name: 'generation_jobs_queued_total',
    help: 'Total number of test case generation jobs queued',
    labelNames: ['test_type', 'status'],
  });

  static generationJobsDuration = new Histogram({
    name: 'generation_jobs_duration_seconds',
    help: 'Duration of test case generation jobs in seconds',
    labelNames: ['test_type', 'status'],
    buckets: [1, 5, 10, 30, 60, 120],
  });

  static generationJobsActive = new Gauge({
    name: 'generation_jobs_active',
    help: 'Number of active generation jobs',
    labelNames: ['test_type'],
  });

  static testCasesGenerated = new Counter({
    name: 'test_cases_generated_total',
    help: 'Total number of test cases generated',
    labelNames: ['test_type', 'status'],
  });

  static testCasesApproved = new Counter({
    name: 'test_cases_approved_total',
    help: 'Total number of test cases approved by users',
    labelNames: ['user_role'],
  });

  static testCasesRejected = new Counter({
    name: 'test_cases_rejected_total',
    help: 'Total number of test cases rejected by users',
    labelNames: ['user_role'],
  });

  /**
   * Jira Integration Metrics
   */
  static jiraPollsExecuted = new Counter({
    name: 'jira_polls_executed_total',
    help: 'Total number of Jira polling cycles executed',
    labelNames: ['project', 'status'],
  });

  static jiraPollDuration = new Histogram({
    name: 'jira_poll_duration_seconds',
    help: 'Duration of Jira polling cycles in seconds',
    labelNames: ['project'],
    buckets: [0.5, 1, 5, 10, 30],
  });

  static jiraTicketsDetected = new Counter({
    name: 'jira_tickets_detected_total',
    help: 'Total number of new/updated Jira tickets detected',
    labelNames: ['project', 'change_type'],
  });

  static jiraTicketsParsed = new Counter({
    name: 'jira_tickets_parsed_total',
    help: 'Total number of Jira tickets parsed',
    labelNames: ['project', 'status'],
  });

  /**
   * Export Metrics
   */
  static exportsTriggered = new Counter({
    name: 'exports_triggered_total',
    help: 'Total number of export operations triggered',
    labelNames: ['format', 'status'],
  });

  static exportFileSize = new Histogram({
    name: 'export_file_size_bytes',
    help: 'Size of generated export files in bytes',
    labelNames: ['format'],
    buckets: [1e4, 1e5, 1e6, 1e7],
  });

  static exportRecordCount = new Histogram({
    name: 'export_record_count',
    help: 'Number of records in export files',
    labelNames: ['format'],
    buckets: [10, 100, 500, 1000, 5000],
  });

  /**
   * Notifications Metrics
   */
  static notificationsCreated = new Counter({
    name: 'notifications_created_total',
    help: 'Total number of notifications created',
    labelNames: ['type', 'priority'],
  });

  static notificationsDelivered = new Counter({
    name: 'notifications_delivered_total',
    help: 'Total number of notifications delivered to users',
    labelNames: ['type', 'channel'],
  });

  static websocketConnections = new Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
    labelNames: ['gateway'],
  });

  /**
   * API Request Metrics
   */
  static httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'endpoint', 'status'],
  });

  static httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  static httpErrorsTotal = new Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'endpoint', 'status'],
  });

  /**
   * Database Metrics
   */
  static databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'entity'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  });

  static databaseConnectionsActive = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
  });

  static databaseQueryErrors = new Counter({
    name: 'database_query_errors_total',
    help: 'Total number of database query errors',
    labelNames: ['operation', 'entity'],
  });

  /**
   * Queue Metrics
   */
  static queueDepth = new Gauge({
    name: 'queue_depth',
    help: 'Number of jobs in queue',
    labelNames: ['queue_name'],
  });

  static queueJobsProcessed = new Counter({
    name: 'queue_jobs_processed_total',
    help: 'Total number of jobs processed from queue',
    labelNames: ['queue_name', 'status'],
  });

  static queueJobDuration = new Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Duration of queue job processing in seconds',
    labelNames: ['queue_name'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
  });

  /**
   * User Activity Metrics
   */
  static userLogins = new Counter({
    name: 'user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['role'],
  });

  static activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
    labelNames: ['role'],
  });

  /**
   * Budget Tracking Metrics
   */
  static budgetSpentEur = new Gauge({
    name: 'budget_spent_eur',
    help: 'Amount of budget spent in EUR',
    labelNames: ['user_role', 'provider'],
  });

  static budgetRemainingEur = new Gauge({
    name: 'budget_remaining_eur',
    help: 'Amount of budget remaining in EUR',
    labelNames: ['user_role'],
  });

  /**
   * System Health Metrics
   */
  static systemUptime = new Gauge({
    name: 'system_uptime_seconds',
    help: 'System uptime in seconds',
  });

  static systemMemoryUsage = new Gauge({
    name: 'system_memory_usage_bytes',
    help: 'System memory usage in bytes',
    labelNames: ['type'],
  });

  static systemCpuUsage = new Gauge({
    name: 'system_cpu_usage_percent',
    help: 'System CPU usage percentage',
  });
}

/**
 * Record HTTP request metrics
 */
export function recordHttpMetrics(
  method: string,
  endpoint: string,
  status: number,
  duration: number,
): void {
  CustomMetrics.httpRequestsTotal.labels(method, endpoint, status.toString()).inc();
  CustomMetrics.httpRequestDuration.labels(method, endpoint).observe(duration / 1000); // Convert to seconds

  if (status >= 400) {
    CustomMetrics.httpErrorsTotal.labels(method, endpoint, status.toString()).inc();
  }
}

/**
 * Record database query metrics
 */
export function recordDatabaseMetrics(
  operation: string,
  entity: string,
  duration: number,
  error?: boolean,
): void {
  CustomMetrics.databaseQueryDuration.labels(operation, entity).observe(duration / 1000);

  if (error) {
    CustomMetrics.databaseQueryErrors.labels(operation, entity).inc();
  }
}

/**
 * Record LLM API metrics
 */
export function recordLLMMetrics(
  provider: string,
  model: string,
  status: string,
  duration: number,
  tokensUsed: number,
  costEur: number,
): void {
  CustomMetrics.llmApiCalls.labels(provider, model, status).inc();
  CustomMetrics.llmApiDuration.labels(provider, model).observe(duration / 1000);
  CustomMetrics.llmTokensUsed.labels(provider, 'total').inc(tokensUsed);
  CustomMetrics.llmCostEur.labels(provider, 'global').inc(costEur);
}

/**
 * Record generation job metrics
 */
export function recordGenerationMetrics(
  testType: string,
  status: string,
  duration: number,
): void {
  CustomMetrics.generationJobsDuration.labels(testType, status).observe(duration / 1000);
  CustomMetrics.testCasesGenerated.labels(testType, status).inc();
}
