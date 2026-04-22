/**
 * LLM Provider Abstraction Interface
 * Defines the contract for LLM providers (OpenAI, Groq, etc.)
 */

export enum LLMModelType {
  GPT_4O = 'gpt-4o',
  GROQ_LLAMA_70B = 'llama-3.1-70b',
  GROQ_MIXTRAL = 'mixtral-8x7b',
}

export interface LLMOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'json' | 'text';
  systemPrompt?: string;
  retryCount?: number;
  timeoutMs?: number;
}

export interface LLMTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMTokenUsage;
  model: string;
  latencyMs: number;
  provider: string;
  cached?: boolean;
}

export interface ModelInfo {
  name: string;
  provider: string;
  version: string;
  maxContextWindow: number;
  costPer1kInputTokens: number; // in EUR
  costPer1kOutputTokens: number; // in EUR
}

export interface ILLMProvider {
  /**
   * Provider name (e.g., 'openai', 'groq')
   */
  name: string;

  /**
   * Generate text using LLM
   * @param prompt User prompt
   * @param options LLM configuration options
   * @returns Promise<LLMResponse>
   */
  generate(prompt: string, options: LLMOptions): Promise<LLMResponse>;

  /**
   * Parse content and validate against schema
   * @param content Content to parse
   * @param schemaString JSON schema as string
   * @returns Parsed and validated content
   */
  parse<T>(content: string, schemaString: string): Promise<T>;

  /**
   * Estimate token count for text
   * @param text Input text
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Get provider model information
   * @returns ModelInfo
   */
  getModelInfo(): ModelInfo;

  /**
   * Health check for provider
   * @returns Promise<boolean>
   */
  healthCheck(): Promise<boolean>;

  /**
   * Calculate cost for token usage
   * @param usage Token usage stats
   * @returns Cost in EUR
   */
  calculateCost(usage: LLMTokenUsage): number;
}
