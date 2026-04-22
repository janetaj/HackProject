/**
 * Dashboard Service
 * Aggregation logic for dashboard statistics and analytics
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DashboardStatsDto } from '../dtos/dashboard-stats.dto';
import { ActivityFeedDto, ActivityItemDto, ActivityType } from '../dtos/activity-feed.dto';
import { TokenUsageDto } from '../dtos/token-usage.dto';
import { User } from '../../users/entities/user.entity';
import { TestCase } from '../../generator/entities/test-case.entity';
import { JiraTicket } from '../../jira/entities/jira-ticket.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL = 120; // 2 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TestCase)
    private testCaseRepository: Repository<TestCase>,
    @InjectRepository(JiraTicket)
    private jiraTicketRepository: Repository<JiraTicket>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Get overall dashboard statistics (cached)
   */
  async getDashboardStats(userId?: string): Promise<DashboardStatsDto> {
    // TODO: Implement caching with Redis when redis service is available
    // const cacheKey = `dashboard:stats:${userId || 'global'}`;
    // const cached = await this.redisService.get<DashboardStatsDto>(cacheKey);
    // if (cached) {
    //   return { ...cached, cacheExpiresIn: this.CACHE_TTL };
    // }

    // Calculate fresh stats
    const stats = await this.calculateDashboardStats(userId);

    // TODO: Cache for 2 minutes when redis service is available
    // await this.redisService.set(cacheKey, stats, this.CACHE_TTL);

    return { ...stats, cacheExpiresIn: this.CACHE_TTL };
  }

  /**
   * Calculate dashboard statistics from database
   */
  private async calculateDashboardStats(
    userId?: string,
  ): Promise<DashboardStatsDto> {
    try {
      // Get ticket count
      const ticketCount = await this.jiraTicketRepository.count();

      // Get test case counts
      let testCaseQuery = this.testCaseRepository.createQueryBuilder('tc');
      if (userId) {
        testCaseQuery = testCaseQuery.where('tc.created_by = :userId', {
          userId,
        });
      }

      const testCaseCount = await testCaseQuery.getCount();
      const pendingApprovalCount = await testCaseQuery
        .andWhere('tc.status = :status', { status: 'pending_review' })
        .getCount();

      const approvedCount = await testCaseQuery
        .andWhere('tc.status = :status', { status: 'approved' })
        .getCount();

      const rejectedCount = await testCaseQuery
        .andWhere('tc.status = :status', { status: 'rejected' })
        .getCount();

      // Get user counts
      const totalUsersCount = await this.userRepository.count({
        where: { deleted_at: null },
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activeUsersCount = await this.auditLogRepository
        .createQueryBuilder('al')
        .select('DISTINCT al.userId')
        .where('al.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
        .getCount();

      // Get token usage and cost (from audit logs of LLM calls)
      const tokenUsageResult = await this.auditLogRepository
        .createQueryBuilder('al')
        .select('al.metadata', 'metadata')
        .where('al.action IN (:...actions)', {
          actions: ['generate', 'parse', 'export'],
        })
        .getRawMany();

      let totalTokensUsed = 0;
      let budgetSpent = 0;

      tokenUsageResult.forEach((row) => {
        if (row.metadata) {
          totalTokensUsed += row.metadata.tokens_used || 0;
          budgetSpent += row.metadata.cost_eur || 0;
        }
      });

      // Get budget allocation (hardcoded for MVP, from config in future)
      const budgetAllocated = this.calculateBudgetAllocation(userId);
      const budgetRemaining = Math.max(0, budgetAllocated - budgetSpent);
      const budgetUsagePercent =
        budgetAllocated > 0 ? (budgetSpent / budgetAllocated) * 100 : 0;

      // Get test cases created in last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      let testCasesLast24hQuery = this.testCaseRepository
        .createQueryBuilder('tc')
        .where('tc.created_at >= :twentyFourHoursAgo', { twentyFourHoursAgo });

      if (userId) {
        testCasesLast24hQuery = testCasesLast24hQuery.andWhere(
          'tc.created_by = :userId',
          { userId },
        );
      }

      const testCasesLast24h = await testCasesLast24hQuery.getCount();

      const cachedAt = new Date();

      return {
        ticketCount,
        testCaseCount,
        pendingApprovalCount,
        approvedCount,
        rejectedCount,
        budgetSpent,
        budgetAllocated,
        budgetRemaining,
        budgetUsagePercent,
        totalTokensUsed,
        activeUsersCount,
        totalUsersCount,
        testCasesLast24h,
        cachedAt,
        cacheExpiresIn: this.CACHE_TTL,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get activity feed (recent activities)
   */
  async getActivityFeed(
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ): Promise<ActivityFeedDto> {
    if (page < 1 || limit < 1 || limit > 100) {
      throw new BadRequestException('Invalid page or limit parameters');
    }

    const offset = (page - 1) * limit;

    try {
      // Query audit logs for activities
      let query = this.auditLogRepository
        .createQueryBuilder('al')
        .orderBy('al.createdAt', 'DESC');

      if (userId) {
        query = query.where('al.userId = :userId', { userId });
      }

      const [audits, total] = await query
        .take(limit)
        .skip(offset)
        .getManyAndCount();

      // Convert audit logs to activity items
      const items = audits.map((audit) =>
        this.mapAuditToActivityItem(audit),
      );

      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get activity feed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token usage breakdown
   */
  async getTokenUsage(
    startDate?: Date,
    endDate?: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<TokenUsageDto> {
    try {
      // Default: last 30 days
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query token usage from audit logs
      const auditLogs = await this.auditLogRepository
        .createQueryBuilder('al')
        .where('al.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('al.metadata IS NOT NULL')
        .orderBy('al.createdAt', 'DESC')
        .getMany();

      // Group by provider
      const byProvider = this.groupTokensByProvider(auditLogs);

      // Group by action
      const byAction = this.groupTokensByAction(auditLogs);

      // Group by day
      const dailyUsage = this.groupTokensByDay(auditLogs, granularity);

      // Calculate summary
      const totalTokens = auditLogs.reduce(
        (sum, log) => sum + (log.metadata?.tokens_used || 0),
        0,
      );
      const totalCostEur = auditLogs.reduce(
        (sum, log) => sum + (log.metadata?.cost_eur || 0),
        0,
      );
      const totalApiCalls = auditLogs.length;
      const averageTokensPerCall =
        totalApiCalls > 0 ? totalTokens / totalApiCalls : 0;

      const topProvider =
        byProvider.length > 0
          ? byProvider.reduce((prev, current) =>
              prev.totalTokens > current.totalTokens ? prev : current,
            ).provider
          : 'unknown';

      const topAction =
        byAction.length > 0
          ? byAction.reduce((prev, current) =>
              prev.totalTokens > current.totalTokens ? prev : current,
            ).action
          : 'unknown';

      return {
        byProvider,
        byAction,
        dailyUsage,
        summary: {
          totalTokens,
          totalCostEur,
          totalApiCalls,
          averageTokensPerCall,
          topProvider,
          topAction,
          period: {
            startDate: start,
            endDate: end,
            granularity,
          },
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get token usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map audit log to activity item
   */
  private mapAuditToActivityItem(audit: AuditLog): ActivityItemDto {
    let type = ActivityType.CONFIG_CHANGED;
    let title = 'Unknown Action';
    let description = '';
    let severity: 'info' | 'warning' | 'error' | 'success' = 'info';

    // Map action to activity type
    if (audit.action === 'generate') {
      type = ActivityType.GENERATION_QUEUED;
      title = 'Test Case Generation Started';
      description = `Generation job initiated for ${audit.entity}`;
      severity = 'info';
    } else if (audit.action === 'approve_test_case') {
      type = ActivityType.TEST_CASE_APPROVED;
      title = 'Test Case Approved';
      description = `Test case ${audit.entityId} has been approved`;
      severity = 'success';
    } else if (audit.action === 'reject_test_case') {
      type = ActivityType.TEST_CASE_REJECTED;
      title = 'Test Case Rejected';
      description = `Test case ${audit.entityId} has been rejected`;
      severity = 'warning';
    } else if (audit.action === 'export') {
      type = ActivityType.TEST_CASE_EXPORTED;
      title = 'Export Completed';
      description = `Data exported for ${audit.entity}`;
      severity = 'info';
    } else if (audit.action === 'login') {
      type = ActivityType.USER_LOGIN;
      title = 'User Login';
      description = `User logged in from ${audit.ipAddress}`;
      severity = 'info';
    } else if (audit.action === 'user_create') {
      type = ActivityType.USER_CREATED;
      title = 'New User Created';
      description = `New user account has been created`;
      severity = 'info';
    }

    const severity_status = audit.status === 'success' ? 'success' : 'error';

    return {
      id: audit.id,
      type,
      title,
      description,
      performedBy: {
        id: audit.userId,
        name: 'User',
        email: 'unknown@app.local',
        role: 'qa_tester',
      },
      relatedEntity: {
        id: audit.entityId,
        name: audit.entity,
      },
      metadata: audit.metadata,
      timestamp: audit.createdAt,
      severity: severity_status as any,
      actionUrl: this.generateActionUrl(audit),
    };
  }

  /**
   * Generate action URL based on audit log
   */
  private generateActionUrl(audit: AuditLog): string {
    switch (audit.entity) {
      case 'test_case':
        return `/test-cases/${audit.entityId}`;
      case 'generation_job':
        return `/jobs/${audit.entityId}`;
      case 'jira_ticket':
        return `/tickets/${audit.entityId}`;
      case 'user':
        return `/users/${audit.entityId}`;
      default:
        return '#';
    }
  }

  /**
   * Group token usage by provider
   */
  private groupTokensByProvider(auditLogs: AuditLog[]) {
    const grouped: Record<string, any> = {};

    auditLogs.forEach((log) => {
      const provider = log.metadata?.provider || 'unknown';
      if (!grouped[provider]) {
        grouped[provider] = {
          provider,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          costEur: 0,
          callCount: 0,
        };
      }

      grouped[provider].totalTokens += log.metadata?.tokens_used || 0;
      grouped[provider].inputTokens += log.metadata?.input_tokens || 0;
      grouped[provider].outputTokens += log.metadata?.output_tokens || 0;
      grouped[provider].costEur += log.metadata?.cost_eur || 0;
      grouped[provider].callCount += 1;
    });

    return Object.values(grouped).map((item) => ({
      ...item,
      averageTokensPerCall:
        item.callCount > 0 ? item.totalTokens / item.callCount : 0,
    }));
  }

  /**
   * Group token usage by action type
   */
  private groupTokensByAction(auditLogs: AuditLog[]) {
    const grouped: Record<string, any> = {};

    auditLogs.forEach((log) => {
      const action = log.action || 'unknown';
      if (!grouped[action]) {
        grouped[action] = {
          action,
          totalTokens: 0,
          actionCount: 0,
          costEur: 0,
        };
      }

      grouped[action].totalTokens += log.metadata?.tokens_used || 0;
      grouped[action].actionCount += 1;
      grouped[action].costEur += log.metadata?.cost_eur || 0;
    });

    return Object.values(grouped).map((item) => ({
      ...item,
      averageTokensPerAction:
        item.actionCount > 0 ? item.totalTokens / item.actionCount : 0,
    }));
  }

  /**
   * Group token usage by day/week/month
   */
  private groupTokensByDay(
    auditLogs: AuditLog[],
    granularity: 'daily' | 'weekly' | 'monthly',
  ) {
    const grouped: Record<string, any> = {};

    auditLogs.forEach((log) => {
      const date = new Date(log.createdAt);
      let key: string;

      if (granularity === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        // monthly
        key = date.toISOString().substr(0, 7);
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: new Date(key),
          tokenCount: 0,
          costEur: 0,
        };
      }

      grouped[key].tokenCount += log.metadata?.tokens_used || 0;
      grouped[key].costEur += log.metadata?.cost_eur || 0;
    });

    return Object.values(grouped).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }

  /**
   * Calculate budget allocation based on user role
   */
  private calculateBudgetAllocation(userId?: string): number {
    // Role-based daily limits (hardcoded for MVP)
    // In production, fetch from database or config service
    const dailyLimits: Record<string, number> = {
      admin: 100,
      lead: 50,
      tester: 20,
      viewer: 5,
    };

    // Default to viewer if user not found
    return dailyLimits['admin'] * 30; // Monthly budget (simplified)
  }
}
