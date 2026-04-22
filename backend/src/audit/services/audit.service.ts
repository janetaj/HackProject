/**
 * Audit Service
 * Business logic for audit logging and compliance reporting
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditRepository } from '../repositories/audit.repository';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private auditRepository: AuditRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Capture action with before/after snapshots
   * Main entry point for audit logging
   */
  async captureActionWithSnapshots(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    beforeSnapshot: Record<string, any>,
    afterSnapshot: Record<string, any>,
    context: {
      ipAddress?: string;
      userAgent?: string;
      description?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<AuditLog> {
    try {
      const auditLog = await this.auditRepository.createLog({
        userId,
        action: action as any,
        entity: entity as any,
        entityId,
        beforeSnapshot: this.maskSensitiveData(beforeSnapshot),
        afterSnapshot: this.maskSensitiveData(afterSnapshot),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        description: context.description,
        metadata: context.metadata,
        status: 'success',
      });

      this.logger.debug(
        `Audit logged: ${action} on ${entity} ${entityId} by user ${userId}`,
      );

      // Emit event for downstream processing
      this.eventEmitter.emit('audit.action_logged', {
        auditId: auditLog.id,
        userId,
        action,
        entity,
        entityId,
        status: auditLog.status,
      });

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to capture audit: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Capture failed action
   */
  async captureFailedAction(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    errorMessage: string,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      description?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<AuditLog> {
    try {
      const auditLog = await this.auditRepository.createLog({
        userId,
        action: action as any,
        entity: entity as any,
        entityId,
        status: 'failure',
        errorMessage,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        description: context?.description,
        metadata: context?.metadata,
      });

      this.logger.warn(
        `Audit logged (FAILURE): ${action} on ${entity} ${entityId} - ${errorMessage}`,
      );

      // Emit event for monitoring/alerting
      this.eventEmitter.emit('audit.action_failed', {
        auditId: auditLog.id,
        userId,
        action,
        entity,
        entityId,
        errorMessage,
      });

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to capture failed audit: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Batch capture multiple actions
   */
  async captureActionBatch(
    records: Array<{
      userId: string;
      action: string;
      entity: string;
      entityId: string;
      beforeSnapshot?: Record<string, any>;
      afterSnapshot?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      description?: string;
    }>,
  ): Promise<AuditLog[]> {
    try {
      const auditLogs = await Promise.all(
        records.map((record) =>
          this.auditRepository.createLog({
            userId: record.userId,
            action: record.action as any,
            entity: record.entity as any,
            entityId: record.entityId,
            beforeSnapshot: this.maskSensitiveData(record.beforeSnapshot),
            afterSnapshot: this.maskSensitiveData(record.afterSnapshot),
            ipAddress: record.ipAddress,
            userAgent: record.userAgent,
            description: record.description,
            status: 'success',
          }),
        ),
      );

      this.logger.debug(`Batch audit logged: ${auditLogs.length} records`);

      return auditLogs;
    } catch (error) {
      this.logger.error(
        `Failed to capture batch audit: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get audit logs for user
   */
  async getUserLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditRepository.getByUserId(
      userId,
      limit,
      offset,
    );
    return { logs, total };
  }

  /**
   * Search audit logs
   */
  async search(
    filters: {
      userId?: string;
      action?: string;
      entity?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: 'success' | 'failure';
    },
    limit: number = 100,
    offset: number = 0,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const [logs, total] = await this.auditRepository.search(
      filters,
      limit,
      offset,
    );
    return { logs, total };
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    return this.auditRepository.getStatistics();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    actionTypes?: string[],
  ): Promise<{
    period: { startDate: Date; endDate: Date };
    totalRecords: number;
    actionBreakdown: Record<string, number>;
    logs: AuditLog[];
  }> {
    const logs = await this.auditRepository.getComplianceReport(
      startDate,
      endDate,
      actionTypes,
    );

    const actionBreakdown: Record<string, number> = {};
    logs.forEach((log) => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    });

    this.logger.log(
      `Generated compliance report: ${logs.length} records from ${startDate} to ${endDate}`,
    );

    this.eventEmitter.emit('audit.compliance_report_generated', {
      period: { startDate, endDate },
      recordCount: logs.length,
      actionTypes: Object.keys(actionBreakdown),
    });

    return {
      period: { startDate, endDate },
      totalRecords: logs.length,
      actionBreakdown,
      logs,
    };
  }

  /**
   * Detect suspicious activities
   */
  async detectSuspiciousActivities(windowMinutes: number = 5): Promise<{
    massDeletes: AuditLog[];
    failedActions: AuditLog[];
    configChanges: AuditLog[];
    summary: string;
  }> {
    const suspicious =
      await this.auditRepository.findDangerousActions(windowMinutes);

    const summary = `Detected: ${suspicious.massDeletes.length} mass deletes, ${suspicious.failedActions.length} failed actions, ${suspicious.configChanges.length} config changes in last ${windowMinutes} minutes`;

    this.logger.warn(`Suspicious activity detected: ${summary}`);

    if (
      suspicious.massDeletes.length > 10 ||
      suspicious.failedActions.length > 20
    ) {
      this.eventEmitter.emit('audit.suspicious_activity_detected', {
        massDeletes: suspicious.massDeletes.length,
        failedActions: suspicious.failedActions.length,
        configChanges: suspicious.configChanges.length,
        window: windowMinutes,
      });
    }

    return {
      ...suspicious,
      summary,
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(startDate: Date, endDate: Date) {
    return this.auditRepository.getUserActivitySummary(startDate, endDate);
  }

  /**
   * Cleanup old logs
   */
  async cleanupOldLogs(retentionDays: number = 7): Promise<number> {
    const deleted = await this.auditRepository.cleanupOldLogs(retentionDays);
    this.logger.log(`Cleaned up ${deleted} old audit logs`);
    return deleted;
  }

  /**
   * Mask sensitive data in snapshots
   * Prevents passwords, tokens, API keys from being logged
   */
  private maskSensitiveData(
    data: Record<string, any>,
  ): Record<string, any> {
    if (!data) return data;

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'jiraToken',
      'jira_token',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
    ];

    const masked = { ...data };

    const maskValue = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach((key) => {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          maskValue(obj[key]);
        }
      });
    };

    maskValue(masked);
    return masked;
  }
}
