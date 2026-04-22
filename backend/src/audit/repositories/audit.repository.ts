/**
 * Audit Repository
 * Query methods for audit log access
 */

import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, In } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditRepository extends Repository<AuditLog> {
  constructor(private dataSource: DataSource) {
    super(AuditLog, dataSource.createEntityManager());
  }

  /**
   * Create immutable audit log entry
   */
  async createLog(auditLog: Partial<AuditLog>): Promise<AuditLog> {
    return this.save({
      ...auditLog,
      createdAt: new Date(),
    });
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * Get all logs for a specific user
   */
  async getByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<[AuditLog[], number]> {
    return this.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get logs by action type
   */
  async getByAction(
    action: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<[AuditLog[], number]> {
    return this.findAndCount({
      where: { action: action as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get logs by entity type
   */
  async getByEntity(
    entity: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<[AuditLog[], number]> {
    return this.findAndCount({
      where: { entity: entity as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Search with multiple filters
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
  ): Promise<[AuditLog[], number]> {
    const query = this.createQueryBuilder('al');

    if (filters.userId) {
      query.andWhere('al.userId = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere('al.action = :action', { action: filters.action });
    }

    if (filters.entity) {
      query.andWhere('al.entity = :entity', { entity: filters.entity });
    }

    if (filters.entityId) {
      query.andWhere('al.entityId = :entityId', {
        entityId: filters.entityId,
      });
    }

    if (filters.startDate || filters.endDate) {
      let dateRange = Between(
        filters.startDate || new Date(0),
        filters.endDate || new Date(),
      );
      query.andWhere('al.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate || new Date(0),
        endDate: filters.endDate || new Date(),
      });
    }

    if (filters.status) {
      query.andWhere('al.status = :status', { status: filters.status });
    }

    query.orderBy('al.createdAt', 'DESC').take(limit).skip(offset);

    return query.getManyAndCount();
  }

  /**
   * Get statistics breakdown
   */
  async getStatistics(): Promise<{
    totalLogs: number;
    actionBreakdown: Array<{ action: string; count: number }>;
    entityBreakdown: Array<{ entity: string; count: number }>;
    successRate: number;
    failureCount: number;
  }> {
    const totalLogs = await this.count();

    const actionBreakdown = await this.createQueryBuilder('al')
      .select('al.action', 'action')
      .addSelect('COUNT(al.id)', 'count')
      .groupBy('al.action')
      .orderBy('count', 'DESC')
      .getRawMany();

    const entityBreakdown = await this.createQueryBuilder('al')
      .select('al.entity', 'entity')
      .addSelect('COUNT(al.id)', 'count')
      .groupBy('al.entity')
      .orderBy('count', 'DESC')
      .getRawMany();

    const failureCount = await this.count({
      where: { status: 'failure' },
    });

    const successRate =
      totalLogs > 0 ? ((totalLogs - failureCount) / totalLogs) * 100 : 100;

    return {
      totalLogs,
      actionBreakdown: actionBreakdown.map((a) => ({
        action: a.action,
        count: parseInt(a.count),
      })),
      entityBreakdown: entityBreakdown.map((e) => ({
        entity: e.entity,
        count: parseInt(e.count),
      })),
      successRate,
      failureCount,
    };
  }

  /**
   * Get compliance report for auditors
   */
  async getComplianceReport(
    startDate: Date,
    endDate: Date,
    actionTypes?: string[],
  ): Promise<AuditLog[]> {
    const query = this.createQueryBuilder('al').where(
      'al.createdAt BETWEEN :startDate AND :endDate',
      { startDate, endDate },
    );

    if (actionTypes && actionTypes.length > 0) {
      query.andWhere('al.action IN (:...actionTypes)', { actionTypes });
    }

    return query.orderBy('al.createdAt', 'DESC').getMany();
  }

  /**
   * Find dangerous actions (unusual patterns)
   * E.g., mass deletes, config changes, failed actions
   */
  async findDangerousActions(
    windowMinutes: number = 5,
  ): Promise<{
    massDeletes: AuditLog[];
    failedActions: AuditLog[];
    configChanges: AuditLog[];
  }> {
    const recentWindow = new Date(Date.now() - windowMinutes * 60 * 1000);

    const massDeletes = await this.find({
      where: {
        action: 'delete',
        createdAt: Between(recentWindow, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const failedActions = await this.find({
      where: {
        status: 'failure',
        createdAt: Between(recentWindow, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const configChanges = await this.find({
      where: {
        action: 'config_change',
        createdAt: Between(recentWindow, new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 30,
    });

    return {
      massDeletes,
      failedActions,
      configChanges,
    };
  }

  /**
   * Clean up old logs beyond retention period
   */
  async cleanupOldLogs(retentionDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.delete({
      createdAt: Between(new Date(0), cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      userId: string;
      totalActions: number;
      successCount: number;
      failureCount: number;
      actionTypes: string[];
    }>
  > {
    const results = await this.createQueryBuilder('al')
      .select('al.userId', 'userId')
      .addSelect('COUNT(al.id)', 'totalActions')
      .addSelect(
        'SUM(CASE WHEN al.status = :success THEN 1 ELSE 0 END)',
        'successCount',
      )
      .addSelect(
        'SUM(CASE WHEN al.status = :failure THEN 1 ELSE 0 END)',
        'failureCount',
      )
      .addSelect(
        'STRING_AGG(DISTINCT al.action, \',\')',
        'actionTypes',
      )
      .where('al.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('success', 'success')
      .setParameter('failure', 'failure')
      .groupBy('al.userId')
      .orderBy('totalActions', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      userId: r.userId,
      totalActions: parseInt(r.totalActions),
      successCount: parseInt(r.successCount || 0),
      failureCount: parseInt(r.failureCount || 0),
      actionTypes: r.actionTypes ? r.actionTypes.split(',') : [],
    }));
  }
}
