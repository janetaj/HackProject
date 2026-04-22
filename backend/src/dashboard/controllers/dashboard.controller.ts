/**
 * Dashboard Controller
 * REST endpoints for dashboard and analytics
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDto } from '../dtos/dashboard-stats.dto';
import { ActivityFeedDto } from '../dtos/activity-feed.dto';
import { TokenUsageDto } from '../dtos/token-usage.dto';
import { User } from '../../users/entities/user.entity';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/stats
   * Get overall dashboard statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get overall dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics', type: DashboardStatsDto })
  async getStats(
    @CurrentUser() user: User,
    @Query('adminView') adminView: boolean = false,
  ): Promise<DashboardStatsDto> {
    try {
      const userId = adminView && user.role === 'admin' ? undefined : user.id;
      return await this.dashboardService.getDashboardStats(userId);
    } catch (error) {
      this.logger.error(`Failed to get dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/stats/global
   */
  @Get('stats/global')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get global dashboard statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Global dashboard statistics', type: DashboardStatsDto })
  async getGlobalStats(): Promise<DashboardStatsDto> {
    try {
      return await this.dashboardService.getDashboardStats();
    } catch (error) {
      this.logger.error(`Failed to get global stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/activity-feed
   */
  @Get('activity')
  @ApiOperation({ summary: 'Get activity feed' })
  @ApiResponse({ status: 200, description: 'Activity feed', type: ActivityFeedDto })
  async getActivityFeed(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('globalView') globalView: boolean = false,
  ): Promise<ActivityFeedDto> {
    try {
      if (page < 1) throw new BadRequestException('Page must be >= 1');
      if (limit < 1 || limit > 100) throw new BadRequestException('Limit must be between 1 and 100');
      const userId = globalView && user.role === 'admin' ? undefined : user.id;
      return await this.dashboardService.getActivityFeed(page, limit, userId);
    } catch (error) {
      this.logger.error(`Failed to get activity feed: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/token-usage
   */
  @Get('token-usage')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get token usage breakdown' })
  @ApiResponse({ status: 200, description: 'Token usage data', type: TokenUsageDto })
  async getTokenUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<TokenUsageDto> {
    try {
      let start: Date | undefined;
      let end: Date | undefined;
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid startDate format');
      }
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) throw new BadRequestException('Invalid endDate format');
      }
      if (start && end && start > end) throw new BadRequestException('startDate must be before endDate');
      if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
        throw new BadRequestException('Granularity must be daily, weekly, or monthly');
      }
      return await this.dashboardService.getTokenUsage(start, end, granularity);
    } catch (error) {
      this.logger.error(`Failed to get token usage: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/budget-summary
   */
  @Get('budget-summary')
  @ApiOperation({ summary: 'Get budget summary for current user' })
  @ApiResponse({ status: 200, description: 'Budget summary' })
  async getBudgetSummary(@CurrentUser() user: User) {
    try {
      const stats = await this.dashboardService.getDashboardStats(user.id);
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (stats.budgetUsagePercent >= 90) status = 'critical';
      else if (stats.budgetUsagePercent >= 75) status = 'warning';
      return {
        allocated: stats.budgetAllocated,
        spent: stats.budgetSpent,
        remaining: stats.budgetRemaining,
        usagePercent: stats.budgetUsagePercent,
        status,
      };
    } catch (error) {
      this.logger.error(`Failed to get budget summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get quick summary for dashboard cards' })
  @ApiResponse({ status: 200, description: 'Dashboard summary metrics' })
  async getSummary(@CurrentUser() user: User) {
    try {
      const stats = await this.dashboardService.getDashboardStats(user.id);
      return {
        testCasesGenerated: stats.testCaseCount,
        testCasesPendingApproval: stats.pendingApprovalCount,
        ticketsDetected: stats.ticketCount,
        budgetUsagePercent: stats.budgetUsagePercent,
        activeUsers: stats.activeUsersCount,
        lastRefreshTime: stats.cachedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * GET /api/dashboard/health
   */
  @Get('health')
  @ApiOperation({ summary: 'Health check for dashboard module' })
  @ApiResponse({ status: 200, description: 'Dashboard module is healthy' })
  async health() {
    return { status: 'ok', module: 'dashboard', timestamp: new Date().toISOString() };
  }
}
