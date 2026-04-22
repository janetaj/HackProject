/**
 * Budget Configuration
 * Token budget, spending limits, and cost control settings
 */

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export interface BudgetAllocation {
  generation: number; // percentage
  parsing: number; // percentage
  chatbot: number; // percentage
}

export interface PerUserDailyLimit {
  admin?: number; // in EUR
  qa_lead?: number; // in EUR
  qa_tester?: number; // in EUR
  viewer?: number; // in EUR
}

export interface BudgetConfig {
  monthlyBudgetEuro: number;
  allocation: BudgetAllocation;
  perUserDailyLimit: PerUserDailyLimit;
  alertThresholds: number[]; // percentages
  exhaustionBehavior: 'hard_stop' | 'fallback_to_groq';
  trackingEnabled: boolean;
  warningThresholdEuro: number;
}

export const getBudgetConfig = (): BudgetConfig => {
  const allocation = parseAllocations(
    process.env.BUDGET_ALLOCATION || 'generation:40,parsing:20,chatbot:40',
  );

  const perUserDailyLimit = parsePerUserLimits(
    process.env.BUDGET_PER_USER_DAILY_LIMIT ||
      'qa_tester:1.0,qa_lead:2.0,admin:5.0',
  );

  const alertThresholds = (
    process.env.BUDGET_ALERT_THRESHOLDS || '50,80,95'
  )
    .split(',')
    .map((t) => parseInt(t, 10));

  return {
    monthlyBudgetEuro: parseFloat(
      process.env.MONTHLY_BUDGET_EURO || '25',
    ),
    allocation,
    perUserDailyLimit,
    alertThresholds,
    exhaustionBehavior:
      (process.env.BUDGET_EXHAUSTION_BEHAVIOR as any) || 'fallback_to_groq',
    trackingEnabled: process.env.BUDGET_TRACKING_ENABLED !== 'false',
    warningThresholdEuro: parseFloat(
      process.env.BUDGET_WARNING_THRESHOLD_EURO || '1.0',
    ),
  };
};

export const validateBudgetConfig = (config: BudgetConfig): void => {
  if (config.monthlyBudgetEuro <= 0) {
    throw new Error('MONTHLY_BUDGET_EURO must be greater than 0');
  }

  const allocationSum =
    config.allocation.generation +
    config.allocation.parsing +
    config.allocation.chatbot;

  if (Math.abs(allocationSum - 100) > 0.1) {
    throw new Error('Budget allocation percentages must sum to 100');
  }

  if (config.allocation.generation < 0 ||
    config.allocation.parsing < 0 ||
    config.allocation.chatbot < 0) {
    throw new Error('Budget allocation percentages must be non-negative');
  }

  if (!config.exhaustionBehavior.match(/^(hard_stop|fallback_to_groq)$/)) {
    throw new Error(
      'BUDGET_EXHAUSTION_BEHAVIOR must be hard_stop or fallback_to_groq',
    );
  }

  if (config.alertThresholds.length === 0) {
    throw new Error('At least one alert threshold must be configured');
  }

  config.alertThresholds.forEach((threshold) => {
    if (threshold <= 0 || threshold > 100) {
      throw new Error('Alert thresholds must be between 1 and 100');
    }
  });
};

/**
 * Parse budget allocation string format: "generation:40,parsing:20,chatbot:40"
 */
function parseAllocations(allocationString: string): BudgetAllocation {
  const result = {
    generation: 0,
    parsing: 0,
    chatbot: 0,
  };

  allocationString.split(',').forEach((part) => {
    const [key, value] = part.split(':');
    const percentage = parseFloat(value);
    if (key === 'generation') result.generation = percentage;
    if (key === 'parsing') result.parsing = percentage;
    if (key === 'chatbot') result.chatbot = percentage;
  });

  return result;
}

/**
 * Parse per-user daily limits: "qa_tester:1.0,qa_lead:2.0,admin:5.0"
 */
function parsePerUserLimits(
  limitsString: string,
): PerUserDailyLimit {
  const result: PerUserDailyLimit = {};

  limitsString.split(',').forEach((part) => {
    const [role, limit] = part.split(':');
    result[role as UserRole] = parseFloat(limit);
  });

  return result;
}
