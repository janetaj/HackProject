/**
 * Jira Configuration
 * Jira Cloud API settings and polling configuration
 */

export interface JiraConfig {
  baseUrl: string;
  apiVersion: string;
  pollIntervalMs: number;
  requestTimeoutMs: number;
  maxRetries: number;
  backoffDelayMs: {
    base: number;
    max: number;
  };
  rateLimitPerMinute: number;
  jql: {
    maxResults: number;
    orderBy: string;
  };
}

export const getJiraConfig = (): JiraConfig => {
  return {
    baseUrl: process.env.JIRA_BASE_URL || 'https://your-org.atlassian.net',
    apiVersion: process.env.JIRA_API_VERSION || '3',
    pollIntervalMs: parseInt(process.env.JIRA_POLL_INTERVAL_MS || '120000', 10), // 2 minutes
    requestTimeoutMs: parseInt(process.env.JIRA_TIMEOUT_MS || '30000', 10), // 30 seconds
    maxRetries: parseInt(process.env.JIRA_MAX_RETRIES || '3', 10),
    backoffDelayMs: {
      base: 1000,
      max: 30000,
    },
    rateLimitPerMinute: parseInt(
      process.env.JIRA_RATE_LIMIT_PER_MINUTE || '60',
      10,
    ),
    jql: {
      maxResults: parseInt(process.env.JIRA_JQL_MAX_RESULTS || '100', 10),
      orderBy: 'updated DESC',
    },
  };
};

export const validateJiraConfig = (config: JiraConfig): void => {
  if (!config.baseUrl) {
    throw new Error('JIRA_BASE_URL is required');
  }

  if (!config.baseUrl.startsWith('http')) {
    throw new Error('JIRA_BASE_URL must be a valid HTTP URL');
  }

  if (config.pollIntervalMs < 30000) {
    console.warn(
      'JIRA_POLL_INTERVAL_MS is less than 30 seconds. Consider increasing to avoid rate limits.',
    );
  }
};
