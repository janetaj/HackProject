/**
 * LLM Response DTO
 * Standardized response from any LLM provider
 */

import { IsString, IsNumber, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class LLMTokenUsage {
  @IsNumber()
  input: number; // Input tokens

  @IsNumber()
  output: number; // Output tokens

  @IsNumber()
  total: number; // Total tokens
}

export class LLMResponseDto {
  @IsString()
  id: string; // Unique response ID (for tracking)

  @IsString()
  content: string; // Main response content

  @IsString()
  model: string; // Which model was used

  @IsString()
  provider: string; // Which provider (openai, groq)

  @IsOptional()
  @IsString()
  finish_reason?: string; // How response ended (stop, length, tool_calls, etc)

  tokens: LLMTokenUsage; // Token usage breakdown

  @IsNumber()
  cost_eur: number; // Cost in euros (calculated from token usage)

  @IsNumber()
  latency_ms: number; // Response time in milliseconds

  @IsOptional()
  @IsArray()
  tool_calls?: any[]; // Function calls made by model (if applicable)

  @IsOptional()
  @IsString()
  error?: string; // Error message if failed

  @IsBoolean()
  cached: boolean; // Whether response came from cache

  @IsString()
  created_at: string; // ISO timestamp

  @IsOptional()
  @IsString()
  cache_key?: string; // Hash of input for caching
}

/**
 * Pricing configuration per provider and model
 */
export interface LLMPricing {
  provider: string;
  model: string;
  inputCostPerMillionTokens: number; // in EUR
  outputCostPerMillionTokens: number; // in EUR
}

/**
 * Standard pricing rates (2024-Q2)
 */
export const DEFAULT_PRICING: LLMPricing[] = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPerMillionTokens: 0.015, // $5 per 1M tokens → ~€4.5
    outputCostPerMillionTokens: 0.06, // $20 per 1M tokens → ~€18
  },
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    inputCostPerMillionTokens: 0.01,
    outputCostPerMillionTokens: 0.03,
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    inputCostPerMillionTokens: 0.0005,
    outputCostPerMillionTokens: 0.0015,
  },
  {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    inputCostPerMillionTokens: 0.00024, // Free tier: €0.18 per 1M for now
    outputCostPerMillionTokens: 0.00024,
  },
  {
    provider: 'groq',
    model: 'llama2-70b-4096',
    inputCostPerMillionTokens: 0.00024,
    outputCostPerMillionTokens: 0.00024,
  },
];

/**
 * Calculate cost in euros from token usage
 */
export function calculateCostEur(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = DEFAULT_PRICING.find(
    (p) => p.provider === provider && p.model === model,
  );

  if (!pricing) {
    console.warn(
      `No pricing found for ${provider}/${model}, using default Groq pricing`,
    );
    // Default to Groq free tier
    return (inputTokens * 0.00024 + outputTokens * 0.00024) / 1000000;
  }

  const inputCost = (inputTokens * pricing.inputCostPerMillionTokens) / 1000000;
  const outputCost = (outputTokens * pricing.outputCostPerMillionTokens) / 1000000;
  return inputCost + outputCost;
}

/**
 * Batch response for multiple LLM calls
 */
export class LLMBatchResponseDto {
  @IsArray()
  responses: LLMResponseDto[];

  @IsNumber()
  totalTokens: number;

  @IsNumber()
  totalCostEur: number;

  @IsNumber()
  totalLatencyMs: number;

  @IsNumber()
  successCount: number;

  @IsNumber()
  failureCount: number;
}

/**
 * Health check response
 */
export class LLMHealthDto {
  @IsBoolean()
  openai_healthy: boolean;

  @IsBoolean()
  groq_healthy: boolean;

  @IsOptional()
  @IsString()
  openai_error?: string;

  @IsOptional()
  @IsString()
  groq_error?: string;

  @IsNumber()
  uptime_seconds: number;

  @IsNumber()
  api_calls_today: number;

  @IsNumber()
  tokens_used_today: number;

  @IsNumber()
  cost_eur_today: number;
}
