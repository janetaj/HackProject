/**
 * Audit Interceptor
 * Automatically captures audit logs for decorated methods
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../services/audit.service';

export const AUDIT_KEY = 'audit_metadata';

export interface AuditMetadata {
  action: string;
  entity: string;
  entityIdExtractor?: (request: any, response: any) => string;
  snapshotExtractor?: (request: any, response: any) => {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: (request: any, response: any) => Record<string, any>;
}

/**
 * @Audit decorator for methods requiring audit logging
 */
export function Audit(
  action: string,
  entity: string,
  options?: {
    entityIdExtractor?: (request: any, response: any) => string;
    snapshotExtractor?: (request: any, response: any) => {
      before: Record<string, any>;
      after: Record<string, any>;
    };
    metadata?: (request: any, response: any) => Record<string, any>;
  },
) {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const metadata: AuditMetadata = {
      action,
      entity,
      entityIdExtractor: options?.entityIdExtractor,
      snapshotExtractor: options?.snapshotExtractor,
      metadata: options?.metadata,
    };

    Reflect.defineMetadata(AUDIT_KEY, metadata, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const metadata = this.reflector.get<AuditMetadata>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract audit context
    const userId = this.extractUserId(request);
    const ipAddress = this.extractIpAddress(request);
    const userAgent = this.extractUserAgent(request);

    // Extract before snapshot
    const beforeSnapshot = this.extractBeforeSnapshot(
      request,
      metadata,
    );

    const startTime = Date.now();

    return next.handle().pipe(
      tap((result) => {
        // Success case
        this.captureAudit(
          userId,
          metadata,
          request,
          result,
          beforeSnapshot,
          ipAddress,
          userAgent,
          null,
        );
        return result;
      }),
      catchError((error) => {
        // Failure case
        this.captureFailedAudit(
          userId,
          metadata,
          request,
          error,
          beforeSnapshot,
          ipAddress,
          userAgent,
        );
        return throwError(() => error);
      }),
    );
  }

  /**
   * Capture successful action
   */
  private async captureAudit(
    userId: string,
    metadata: AuditMetadata,
    request: any,
    response: any,
    beforeSnapshot: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    error: any,
  ): Promise<void> {
    try {
      const entityId = metadata.entityIdExtractor
        ? metadata.entityIdExtractor(request, response)
        : this.extractEntityId(request);

      let afterSnapshot: Record<string, any> = { status: 'success' };
      if (metadata.snapshotExtractor) {
        const snapshots = metadata.snapshotExtractor(request, response);
        afterSnapshot = { ...snapshots.after, status: 'success' };
      } else if (response && typeof response === 'object') {
        afterSnapshot = { ...response, status: 'success' };
      }

      const customMetadata = metadata.metadata
        ? metadata.metadata(request, response)
        : { method: request.method, path: request.path };

      await this.auditService.captureActionWithSnapshots(
        userId,
        metadata.action,
        metadata.entity,
        entityId,
        beforeSnapshot,
        afterSnapshot,
        {
          ipAddress,
          userAgent,
          metadata: customMetadata,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to capture audit log: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Capture failed action
   */
  private async captureFailedAudit(
    userId: string,
    metadata: AuditMetadata,
    request: any,
    error: any,
    beforeSnapshot: Record<string, any>,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    try {
      const entityId = metadata.entityIdExtractor
        ? metadata.entityIdExtractor(request, null)
        : this.extractEntityId(request);

      const errorMessage =
        error instanceof HttpException
          ? error.getResponse()
          : error.message || 'Unknown error';

      const customMetadata = { method: request.method, path: request.path };

      await this.auditService.captureFailedAction(
        userId,
        metadata.action,
        metadata.entity,
        entityId,
        typeof errorMessage === 'string'
          ? errorMessage
          : JSON.stringify(errorMessage),
        {
          ipAddress,
          userAgent,
          metadata: customMetadata,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to capture failed audit log: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Extract user ID from JWT token
   */
  private extractUserId(request: any): string {
    try {
      const user = request.user;
      return user?.id || user?.sub || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Extract user agent from request
   */
  private extractUserAgent(request: any): string {
    return request.headers['user-agent'] || 'unknown';
  }

  /**
   * Extract entity ID from request
   */
  private extractEntityId(request: any): string {
    // Try common parameter names
    return (
      request.params?.id ||
      request.params?.testCaseId ||
      request.params?.jobId ||
      request.params?.exportId ||
      request.body?.id ||
      request.body?.entityId ||
      'unknown'
    );
  }

  /**
   * Extract before snapshot from request
   */
  private extractBeforeSnapshot(
    request: any,
    metadata: AuditMetadata,
  ): Record<string, any> {
    if (metadata.snapshotExtractor) {
      // Will be overridden in tap/catchError
      return {};
    }

    return {
      method: request.method,
      path: request.path,
      body: request.body,
      query: request.query,
    };
  }
}
