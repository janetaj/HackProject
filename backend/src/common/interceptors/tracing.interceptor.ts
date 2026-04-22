/**
 * Tracing Interceptor
 * Creates OpenTelemetry spans for distributed tracing
 * Tracks request flow across services
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

/**
 * Placeholder for OpenTelemetry integration
 * In production, this would use @opentelemetry/api and @opentelemetry/sdk-node
 */

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // TODO: Integrate with OpenTelemetry tracer
    // const tracer = trace.getTracer('testgen-backend');
    // const span = tracer.startSpan(`${method} ${url}`);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        // span.setAttributes({
        //   'http.method': method,
        //   'http.url': url,
        //   'http.duration_ms': duration,
        //   'http.status_code': response.statusCode,
        // });
        // span.end();
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        // span.recordException(error);
        // span.setAttributes({
        //   'http.status_code': error?.status || 500,
        //   'http.duration_ms': duration,
        //   'error': true,
        // });
        // span.end();
        throw error;
      }),
    );
  }
}
