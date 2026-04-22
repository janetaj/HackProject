/**
 * Budget Manager Service
 * Enforces budget limits and prevents overspending
 */

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenTrackerService } from './token-tracker.service';
import { UsersService } from '../../users/users.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

interface UserBudget {
  userId: string;
  dailyLimitEur: number;
  monthlyLimitEur: number;
  remainingToday: number;
  remainingThisMonth: number;
  exhausted: boolean;
  exhaustedReason?: string;
}

interface BudgetAllocation {
  total_eur: number;
  parsing_percentage: number; // 20%
  generation_percentage: number; // 40%
  chatbot_percentage: number; // 40%
}

@Injectable()
export class BudgetManagerService {
  private readonly logger = new Logger(BudgetManagerService.name);
  private readonly BUDGET_PREFIX = 'budget:';
  private readonly SPENT_TODAY_PREFIX = 'spent_today:';
  private readonly SPENT_MONTH_PREFIX = 'spent_month:';

  private budgetAllocation: BudgetAllocation = {
    total_eur: 100, // Default €100/month
    parsing_percentage: 0.2,
    generation_percentage: 0.4,
    chatbot_percentage: 0.4,
  };

  constructor(
    private tokenTracker: TokenTrackerService,
    private usersService: UsersService,
    private configService: ConfigService,
    @InjectRedis() private redisClient: Redis,
  ) {
    this.loadBudgetAllocation();
  }

  /**
   * Load budget allocation from config
   */
  private loadBudgetAllocation(): void {
    try {
      // TODO: Get from config module
      // this.budgetAllocation = this.configService.get('budget');
    } catch (error) {
      this.logger.warn(
        `Failed to load budget config, using defaults: ${error.message}`,
      );
    }
  }

  /**
   * Check if user has budget for action
   */
  async checkBudget(
    userId: string,
    estimatedCostEur: number,
    action: string,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    remainingBudget: number;
  }> {
    try {
      // Get user budget
      const budget = await this.getUserBudget(userId);

      if (budget.exhausted) {
        return {
          allowed: false,
          reason: `Budget exhausted: ${budget.exhaustedReason}`,
          remainingBudget: 0,
        };
      }

      const actionBudget = this.getAllocationForAction(action);

      // Check daily limit for this action
      const dailySpent = await this.getDailySpentForAction(userId, action);
      const dailyActionLimit = (budget.dailyLimitEur * actionBudget) / 1; // Simplified

      if (dailySpent + estimatedCostEur > dailyActionLimit) {
        return {
          allowed: false,
          reason: `Daily limit exceeded for ${action}`,
          remainingBudget: Math.max(0, dailyActionLimit - dailySpent),
        };
      }

      // Check overall daily limit
      if (estimatedCostEur > budget.remainingToday) {
        return {
          allowed: false,
          reason: `Exceeds remaining daily budget (€${budget.remainingToday.toFixed(2)})`,
          remainingBudget: budget.remainingToday,
        };
      }

      return {
        allowed: true,
        remainingBudget: budget.remainingToday - estimatedCostEur,
      };
    } catch (error) {
      this.logger.error(`Budget check failed: ${error.message}`);
      // On error, allow but log warning
      return {
        allowed: true,
        reason: 'Budget check failed (allowed by default)',
        remainingBudget: 0,
      };
    }
  }

  /**
   * Record spending against budget
   */
  async recordSpending(
    userId: string,
    costEur: number,
    action: string,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toISOString().substring(0, 7);

      const todayKey = `${this.SPENT_TODAY_PREFIX}${userId}:${today}`;
      const monthKey = `${this.SPENT_MONTH_PREFIX}${userId}:${month}`;

      // Update today's spending
      const todaySpent = await this.redisClient.incrbyfloat(todayKey, costEur);
      await this.redisClient.expire(todayKey, 86400); // Expire in 24h

      // Update month's spending
      const monthSpent = await this.redisClient.incrbyfloat(monthKey, costEur);
      await this.redisClient.expire(monthKey, 86400 * 30); // Expire in 30 days

      this.logger.debug(
        `Recorded spending for user ${userId}: €${costEur.toFixed(2)} (today: €${todaySpent}, month: €${monthSpent})`,
      );

      // Check if budget exhausted
      await this.checkBudgetExhaustion(userId);
    } catch (error) {
      this.logger.error(`Failed to record spending: ${error.message}`);
    }
  }

  /**
   * Get user budget with remaining amounts
   */
  async getUserBudget(userId: string): Promise<UserBudget> {
    try {
      // TODO: Get per-user budget from database
      // For now, use fixed allocation by role
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      const dailyLimit = this.getDailyLimitByRole(user.role);
      const monthlyLimit = dailyLimit * 30;

      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toISOString().substring(0, 7);

      const todaySpent = parseFloat(
        (await this.redisClient.get(`${this.SPENT_TODAY_PREFIX}${userId}:${today}`)) || '0',
      );
      const monthSpent = parseFloat(
        (await this.redisClient.get(`${this.SPENT_MONTH_PREFIX}${userId}:${month}`)) || '0',
      );

      const exhausted =
        todaySpent >= dailyLimit || monthSpent >= monthlyLimit;

      return {
        userId,
        dailyLimitEur: dailyLimit,
        monthlyLimitEur: monthlyLimit,
        remainingToday: Math.max(0, dailyLimit - todaySpent),
        remainingThisMonth: Math.max(0, monthlyLimit - monthSpent),
        exhausted,
        exhaustedReason: exhausted
          ? todaySpent >= dailyLimit
            ? 'Daily limit reached'
            : 'Monthly limit reached'
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get user budget: ${error.message}`);
      // Return default budget on error
      return {
        userId,
        dailyLimitEur: 10,
        monthlyLimitEur: 300,
        remainingToday: 10,
        remainingThisMonth: 300,
        exhausted: false,
      };
    }
  }

  /**
   * Get daily limit by user role
   */
  private getDailyLimitByRole(role: string): number {
    const limits: Record<string, number> = {
      admin: 100, // €100/day
      qa_lead: 50, // €50/day
      qa_tester: 20, // €20/day
      viewer: 5, // €5/day
    };
    return limits[role] || 10; // Default €10/day
  }

  /**
   * Get budget allocation for action
   */
  private getAllocationForAction(action: string): number {
    const actionAllocations: Record<string, number> = {
      parse: this.budgetAllocation.parsing_percentage,
      parsing: this.budgetAllocation.parsing_percentage,
      generate: this.budgetAllocation.generation_percentage,
      generation: this.budgetAllocation.generation_percentage,
      chatbot: this.budgetAllocation.chatbot_percentage,
      default: 0.33, // Equal split
    };
    return actionAllocations[action] || actionAllocations['default'];
  }

  /**
   * Get daily spending for a specific action
   */
  private async getDailySpentForAction(
    userId: string,
    action: string,
  ): Promise<number> {
    try {
      // TODO: Query PostgreSQL for action-specific spending
      // SELECT SUM(cost_eur) FROM token_usage
      // WHERE user_id = ? AND action = ? AND DATE(created_at) = CURRENT_DATE
      return 0;
    } catch (error) {
      this.logger.warn(
        `Failed to get daily spending for action ${action}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Check if budget is exhausted and handle appropriately
   */
  private async checkBudgetExhaustion(userId: string): Promise<void> {
    const budget = await this.getUserBudget(userId);

    if (budget.exhausted) {
      this.logger.warn(`Budget exhausted for user ${userId}: ${budget.exhaustedReason}`);
      // TODO: Send notification to user
      // TODO: Alert admins if needed
    }
  }

  /**
   * Get system-wide budget statistics
   */
  async getSystemBudgetStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalSpent: number;
    averagePerUser: number;
    topSpenders: Array<{ userId: string; spent: number }>;
    allocationUsage: Record<string, number>;
  }> {
    // TODO: Query PostgreSQL with aggregations
    return {
      totalSpent: 0,
      averagePerUser: 0,
      topSpenders: [],
      allocationUsage: {
        parsing: 0,
        generation: 0,
        chatbot: 0,
      },
    };
  }

  /**
   * Reset user budget (admin only)
   */
  async resetUserBudget(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const month = new Date().toISOString().substring(0, 7);

      const todayKey = `${this.SPENT_TODAY_PREFIX}${userId}:${today}`;
      const monthKey = `${this.SPENT_MONTH_PREFIX}${userId}:${month}`;

      await this.redisClient.del(todayKey, monthKey);
      this.logger.log(`Reset budget for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to reset budget: ${error.message}`);
    }
  }

  /**
   * Adjust user budget (admin only)
   */
  async adjustUserBudget(
    userId: string,
    adjustmentEur: number,
    reason: string,
  ): Promise<void> {
    // TODO: Update user budget in database
    this.logger.log(
      `Adjusted budget for user ${userId} by €${adjustmentEur} (reason: ${reason})`,
    );
  }

  /**
   * Get recommended fallback provider based on remaining budget
   */
  async getRecommendedProvider(
    userId: string,
    estimatedCostOpenAI: number,
    estimatedCostGroq: number,
  ): Promise<'openai' | 'groq'> {
    const budget = await this.getUserBudget(userId);

    // If OpenAI exceeds remaining budget but Groq doesn't, use Groq
    if (
      estimatedCostOpenAI > budget.remainingToday &&
      estimatedCostGroq <= budget.remainingToday
    ) {
      this.logger.debug(`Recommending Groq due to budget constraints for user ${userId}`);
      return 'groq';
    }

    // Default to OpenAI (better quality)
    return 'openai';
  }
}
