/**
 * Global Exception Filter
 * Catches all exceptions and formats them into standardized error responses
 * Applied globally to all routes
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  message: string;
  details?: any;
  path?: string;
  correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const statusCode = this.getStatusCode(exception);
    const message = this.getMessage(exception);
    const errorDetails = this.getErrorDetails(exception);
    const correlationId = request.correlationId || 'unknown';

    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      path: request.url,
      correlationId,
    };

    if (errorDetails) {
      errorResponse.details = errorDetails;
    }

    // Log error
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId,
        level: 'error',
        message: `Exception: ${message}`,
        statusCode,
        exception: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    );

    httpAdapter.reply(ctx.getResponse(), errorResponse, statusCode);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof Error) {
      // Handle common HTTP exceptions
      if ('status' in exception) {
        return (exception as any).status;
      }
      if ((exception as any).getStatus) {
        return (exception as any).getStatus();
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'An unexpected error occurred';
  }

  private getErrorDetails(exception: unknown): any {
    if (exception instanceof Error) {
      if ('response' in exception) {
        return (exception as any).response;
      }
    }
    return null;
  }
}
