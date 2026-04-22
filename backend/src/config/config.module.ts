/**
 * Config Module
 * Central configuration management for all services
 * Loads and validates environment variables at application startup
 */

import { Module } from '@nestjs/common';

import { DatabaseConfig, getDatabaseConfig, validateDatabaseConfig } from './database.config';
import { RedisConfig, getRedisConfig, validateRedisConfig } from './redis.config';
import { JwtConfig, getJwtConfig, validateJwtConfig } from './jwt.config';
import { JiraConfig, getJiraConfig, validateJiraConfig } from './jira.config';
import { LLMConfig, getLLMConfig, validateLLMConfig } from './llm.config';
import { BudgetConfig, getBudgetConfig, validateBudgetConfig } from './budget.config';

/**
 * Consolidated configuration object
 */
export interface AppConfig {
  environment: string;
  port: number;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  jira: JiraConfig;
  llm: LLMConfig;
  budget: BudgetConfig;
}

/**
 * Load and validate all configuration at application startup
 */
export const loadConfiguration = (): AppConfig => {
  const environment = process.env.NODE_ENV || 'development';

  // Load all individual configs
  const database = getDatabaseConfig();
  const redis = getRedisConfig();
  const jwt = getJwtConfig();
  const jira = getJiraConfig();
  const llm = getLLMConfig();
  const budget = getBudgetConfig();

  // Validate all configs
  validateDatabaseConfig(database);
  validateRedisConfig(redis);
  validateJwtConfig(jwt);
  validateJiraConfig(jira);
  validateLLMConfig(llm);
  validateBudgetConfig(budget);

  // Log configuration summary (without sensitive data)
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Configuration loaded successfully',
        environment,
        database: { host: database.host, port: database.port, name: database.database },
        redis: { host: redis.host, port: redis.port },
        jwt: { algorithm: jwt.algorithm },
        jira: { baseUrl: jira.baseUrl, pollIntervalMs: jira.pollIntervalMs },
        llm: { primaryProvider: llm.primaryProvider, fallbackProvider: llm.fallbackProvider },
        budget: { monthlyBudgetEuro: budget.monthlyBudgetEuro },
      },
      null,
      2,
    ),
  );

  return {
    environment,
    port: parseInt(process.env.PORT || '3000', 10),
    database,
    redis,
    jwt,
    jira,
    llm,
    budget,
  };
};

/**
 * This provider exposes the configuration to the entire application
 */
const configProvider = {
  provide: 'APP_CONFIG',
  useFactory: loadConfiguration,
};

@Module({
  providers: [configProvider],
  exports: [configProvider],
})
export class ConfigModule {}

// Re-export all individual config types for convenience
export type {
  DatabaseConfig,
  RedisConfig,
  JwtConfig,
  JiraConfig,
  LLMConfig,
  BudgetConfig,
};

// Re-export all individual getters and validators
export {
  getDatabaseConfig,
  validateDatabaseConfig,
  getRedisConfig,
  validateRedisConfig,
  getJwtConfig,
  validateJwtConfig,
  getJiraConfig,
  validateJiraConfig,
  getLLMConfig,
  validateLLMConfig,
  getBudgetConfig,
  validateBudgetConfig,
};
