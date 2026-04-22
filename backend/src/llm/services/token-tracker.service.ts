/**
 * Token Tracker Service
 * Tracks LLM token usage for budgeting and analytics
 */

import { Injectable, Logger } from '@nestjs/common';
import { LLMResponseDto } from '../dto/llm-response.dto';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface TokenUsageRecord {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_eur: number;
  action: string; // parse, generate, chatbot, etc
  request_id?: string;
  created_at: Date;
}

interface TokenStats {
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, { tokens: number; cost: number }>;
  byModel: Record<string, { tokens: number; cost: number }>;
  byAction: Record<string, { tokens: number; cost: number }>;
  recordCount: number;
}

@Injectable()
export class TokenTrackerService {
  private readonly logger = new Logger(TokenTrackerService.name);
  private readonly REDIS_PREFIX = 'tokens:';
  private readonly DAILY_PREFIX = 'tokens:daily:';

  constructor(@InjectRedis() private redisClient: Redis) {}

  /**
   * Record token usage from LLM response
   */
  async recordUsage(
    response: LLMResponseDto,
    userId: string,
    action: string,
  ): Promise<TokenUsageRecord> {
    const record: TokenUsageRecord = {
      id: uuidv4(),
      user_id: userId,
      provider: response.provider,
      model: response.model,
      input_tokens: response.tokens.input,
      output_tokens: response.tokens.output,
      total_tokens: response.tokens.total,
      cost_eur: response.cost_eur,
      action,
      request_id: response.id,
      created_at: new Date(),
    };

    // Store in Redis for quick access
    await this.storeInRedis(record);

    // TODO: Store in PostgreSQL token_usage table for persistence
    // await this.tokenRepository.save(record);

    // Update daily counter
    await this.updateDailyCounter(userId, response);

    this.logger.debug(
      `Recorded ${response.tokens.total} tokens for user ${userId} (action: ${action}, cost: €${response.cost_eur.toFixed(4)})`,
    );

    return record;
  }

  /**
   * Store usage record in Redis
   */
  private async storeInRedis(record: TokenUsageRecord): Promise<void> {
    try {
      const key = `${this.REDIS_PREFIX}${record.user_id}:${record.created_at.toISOString()}`;
      await this.redisClient.setex(
        key,
        86400 * 7, // Keep for 7 days
        JSON.stringify(record),
      );
    } catch (error) {
      this.logger.warn(`Failed to store token usage in Redis: ${error.message}`);
    }
  }

  /**
   * Update daily token counter
   */
  private async updateDailyCounter(
    userId: string,
    response: LLMResponseDto,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${this.DAILY_PREFIX}${userId}:${today}`;

      const current = await this.redisClient.get(key);
      const currentData = current ? JSON.parse(current) : { tokens: 0, cost: 0 };

      currentData.tokens += response.tokens.total;
      currentData.cost += response.cost_eur;

      await this.redisClient.setex(key, 86400, JSON.stringify(currentData));
    } catch (error) {
      this.logger.warn(`Failed to update daily counter: ${error.message}`);
    }
  }

  /**
   * Get token usage for a user in a time period
   */
  async getUserTokenUsage(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    records: TokenUsageRecord[];
  }> {
    // TODO: Query PostgreSQL for historical data
    // SELECT * FROM token_usage WHERE user_id = ? AND created_at BETWEEN ? AND ?
    // ORDER BY created_at DESC

    return {
      totalTokens: 0,
      totalCost: 0,
      records: [],
    };
  }

  /**
   * Get daily token usage for a user
   */
  async getDailyUsage(userId: string, date?: Date): Promise<{
    tokens: number;
    cost: number;
  }> {
    try {
      const day = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const key = `${this.DAILY_PREFIX}${userId}:${day}`;

      const data = await this.redisClient.get(key);
      if (data) {
        return JSON.parse(data);
      }

      return { tokens: 0, cost: 0 };
    } catch (error) {
      this.logger.warn(`Failed to get daily usage: ${error.message}`);
      return { tokens: 0, cost: 0 };
    }
  }

  /**
   * Get token statistics for a user
   */
  async getStatistics(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TokenStats> {
    // TODO: Query PostgreSQL with aggregations
    // SELECT
    //   SUM(total_tokens) as totalTokens,
    //   SUM(cost_eur) as totalCost,
    //   provider, model, action
    // FROM token_usage
    // WHERE user_id = ? AND created_at BETWEEN ? AND ?
    // GROUP BY provider, model, action

    return {
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
      byAction: {},
      recordCount: 0,
    };
  }

  /**
   * Get top models by token usage
   */
  async getTopModels(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<
    Array<{
      model: string;
      provider: string;
      totalTokens: number;
      totalCost: number;
    }>
  > {
    // TODO: Query PostgreSQL with ORDER BY and LIMIT
    return [];
  }

  /**
   * Get top users by token usage
   */
  async getTopUsers(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<
    Array<{
      userId: string;
      totalTokens: number;
      totalCost: number;
    }>
  > {
    // TODO: Query PostgreSQL with aggregation
    return [];
  }

  /**
   * Get action breakdown (parse vs generate vs chatbot)
   */
  async getActionBreakdown(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      action: string;
      tokens: number;
      cost: number;
      percentage: number;
    }>
  > {
    // TODO: Query PostgreSQL with aggregation
    return [];
  }

  /**
   * Calculate average cost per action
   */
  async getAverageCostPerAction(
    action: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // TODO: Query PostgreSQL
    // SELECT AVG(cost_eur) FROM token_usage WHERE action = ? AND created_at BETWEEN ? AND ?
    return 0;
  }

  /**
   * Estimate cost for upcoming action
   */
  estimateCost(
    estimatedTokens: number,
    provider: string,
    model: string,
  ): number {
    // Using average split: 30% input, 70% output
    const inputTokens = Math.ceil(estimatedTokens * 0.3);
    const outputTokens = Math.ceil(estimatedTokens * 0.7);

    const { calculateCostEur } = require('../dto/llm-response.dto');
    return calculateCostEur(provider, model, inputTokens, outputTokens);
  }

  /**
   * Clear usage data for a date range (for testing)
   */
  async clearUsageData(startDate: Date, endDate: Date): Promise<void> {
    // TODO: Delete from PostgreSQL token_usage table
    this.logger.warn(
      `Clearing token usage data for ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );
  }

  /**
   * Export token usage data
   */
  async exportUsageData(
    startDate: Date,
    endDate: Date,
  ): Promise<TokenUsageRecord[]> {
    // TODO: Query PostgreSQL and return all records
    return [];
  }

  /**
   * Get system-wide statistics
   */
  async getSystemStatistics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalTokens: number;
    totalCost: number;
    uniqueUsers: number;
    averageCostPerUser: number;
  }> {
    // TODO: Query PostgreSQL with aggregations across all users
    return {
      totalTokens: 0,
      totalCost: 0,
      uniqueUsers: 0,
      averageCostPerUser: 0,
    };
  }
}
