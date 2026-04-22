/**
 * Token Usage DTO
 * Token usage breakdown and analytics
 */

export class TokenUsageByProviderDto {
  /**
   * Provider name (openai, groq)
   */
  provider: string;

  /**
   * Total tokens used
   */
  totalTokens: number;

  /**
   * Total input tokens
   */
  inputTokens: number;

  /**
   * Total output tokens
   */
  outputTokens: number;

  /**
   * Approximate cost (in EUR)
   */
  costEur: number;

  /**
   * Number of API calls
   */
  callCount: number;

  /**
   * Average tokens per call
   */
  averageTokensPerCall: number;
}

export class TokenUsageByActionDto {
  /**
   * Action type (generate, parse, parse export, etc.)
   */
  action: string;

  /**
   * Total tokens for this action type
   */
  totalTokens: number;

  /**
   * Number of times this action was performed
   */
  actionCount: number;

  /**
   * Average tokens per action
   */
  averageTokensPerAction: number;

  /**
   * Approximate cost (in EUR)
   */
  costEur: number;
}

export class DailyTokenUsageDto {
  /**
   * Date of usage
   */
  date: Date;

  /**
   * Total tokens used
   */
  tokenCount: number;

  /**
   * Cost in EUR
   */
  costEur: number;
}

export class TokenUsageDto {
  /**
   * Breakdown by provider (OpenAI, Groq)
   */
  byProvider: TokenUsageByProviderDto[];

  /**
   * Breakdown by action type
   */
  byAction: TokenUsageByActionDto[];

  /**
   * Daily usage for the period
   */
  dailyUsage: DailyTokenUsageDto[];

  /**
   * Overall statistics
   */
  summary: {
    totalTokens: number;
    totalCostEur: number;
    totalApiCalls: number;
    averageTokensPerCall: number;
    topProvider: string;
    topAction: string;
    period: {
      startDate: Date;
      endDate: Date;
      granularity: 'daily' | 'weekly' | 'monthly';
    };
  };

  /**
   * Timestamp of report generation
   */
  generatedAt: Date;
}
