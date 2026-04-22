/**
 * Logging Interceptor
 * Logs all HTTP requests and responses with correlation IDs
 * Uses Pino logger for structured JSON logging
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate correlation ID if not present
    const correlationId =
      request.headers['x-correlation-id'] || uuidv4();
    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();
    const { method, url, ip } = request;
    const user = request.user?.id || 'anonymous';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            correlationId,
            level: 'info',
            message: 'HTTP Request',
            method,
            url,
            statusCode,
            duration_ms: duration,
            userId: user,
            ip,
          }),
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error?.status || 500;

        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            correlationId,
            level: 'error',
            message: 'HTTP Request Error',
            method,
            url,
            statusCode,
            duration_ms: duration,
            userId: user,
            ip,
            error: error?.message,
            errorStack: error?.stack,
          }),
        );

        throw error;
      }),
    );
  }
}
