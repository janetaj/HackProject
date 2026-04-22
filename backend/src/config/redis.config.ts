/**
 * Redis Configuration
 * Redis connection and BullMQ settings
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryStrategy: {
    maxRetries: number;
    retryDelayMs: number;
  };
  cache: {
    ttlSeconds: number;
  };
  bullmq: {
    concurrency: number;
    maxRetries: number;
    backoffDelayMs: {
      base: number;
      max: number;
    };
  };
}

export const getRedisConfig = (): RedisConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryStrategy: {
      maxRetries: 5,
      retryDelayMs: 1000,
    },
    cache: {
      ttlSeconds: 3600, // 1 hour default
    },
    bullmq: {
      concurrency:
        nodeEnv === 'development'
          ? 1
          : parseInt(process.env.BULLMQ_CONCURRENCY || '3', 10),
      maxRetries: 2,
      backoffDelayMs: {
        base: 1000,
        max: 30000,
      },
    },
  };
};

export const validateRedisConfig = (config: RedisConfig): void => {
  if (!config.host) {
    throw new Error('REDIS_HOST is required');
  }
  if (!config.port) {
    throw new Error('REDIS_PORT is required');
  }
};
