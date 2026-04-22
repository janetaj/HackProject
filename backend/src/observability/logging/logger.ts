/**
 * Logger Configuration
 * Structured JSON logging with Pino
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Factory function to create configured Pino logger
 */
export function createLogger(name: string): pino.Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  const pinoOptions: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
    base: {
      service: name,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({
        level: label.toUpperCase(),
      }),
    },
  };

  return pino(pinoOptions);
}

/**
 * Logger utility class for structured logging
 */
export class Logger {
  private logger: pino.Logger;
  private context: LogContext = {};

  constructor(private name: string) {
    this.logger = createLogger(name);
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): Logger {
    this.context.correlationId = correlationId;
    return this;
  }

  /**
   * Generate new correlation ID if not set
   */
  ensureCorrelationId(): string {
    if (!this.context.correlationId) {
      this.context.correlationId = uuidv4();
    }
    return this.context.correlationId;
  }

  /**
   * Set user ID for audit trail
   */
  setUserId(userId: string): Logger {
    this.context.userId = userId;
    return this;
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug({ ...this.context, ...meta }, message);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info({ ...this.context, ...meta }, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn({ ...this.context, ...meta }, message);
  }

  /**
   * Log error message with stack trace
   */
  error(message: string, error?: Error | string, meta?: Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.error(
        {
          ...this.context,
          ...meta,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message,
      );
    } else {
      this.logger.error({ ...this.context, ...meta, error }, message);
    }
  }

  /**
   * Log critical error
   */
  fatal(message: string, error?: Error | string, meta?: Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.fatal(
        {
          ...this.context,
          ...meta,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        },
        message,
      );
    } else {
      this.logger.fatal({ ...this.context, ...meta, error }, message);
    }
  }

  /**
   * Log with custom level
   */
  log(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, meta?: Record<string, any>): void {
    this.logger[level]({ ...this.context, ...meta }, message);
  }

  /**
   * Create child logger with additional context
   */
  child(childContext: Record<string, any>): Logger {
    const childLogger = new Logger(this.name);
    childLogger.context = { ...this.context, ...childContext };
    return childLogger;
  }
}
