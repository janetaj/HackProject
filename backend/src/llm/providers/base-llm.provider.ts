/**
 * Base LLM Provider Abstract Class
 * Defines interface that all LLM providers must implement
 */

import { Injectable } from '@nestjs/common';
import { LLMOptionsDto, ResolvedLLMOptions } from '../dto/llm-options.dto';
import { LLMResponseDto } from '../dto/llm-response.dto';

/**
 * Abstract provider that concrete implementations must extend
 */
@Injectable()
export abstract class BaseLLMProvider {
  abstract providerName: string; // e.g., 'openai', 'groq'

  /**
   * Call LLM provider
   */
  abstract call(options: ResolvedLLMOptions): Promise<LLMResponseDto>;

  /**
   * Health check for provider
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Estimate tokens before API call
   * Used for budget checking
   */
  abstract estimateTokens(text: string): Promise<number>;

  /**
   * Get list of available models for this provider
   */
  abstract getAvailableModels(): Promise<string[]>;

  /**
   * Validate options are appropriate for this provider
   */
  abstract validateOptions(options: LLMOptionsDto): boolean;

  /**
   * Extract response content from provider-specific format
   */
  protected abstract extractResponseContent(
    providerResponse: any,
  ): string;

  /**
   * Extract token usage from provider response
   */
  protected abstract extractTokenUsage(
    providerResponse: any,
  ): { input: number; output: number };

  /**
   * Extract finish reason from provider response
   */
  protected abstract extractFinishReason(
    providerResponse: any,
  ): string;

  /**
   * Parse JSON response with error handling
   */
  protected parseJsonResponse(content: string): any {
    try {
      // Try to find JSON object in response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try to parse directly
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  /**
   * Construct user message for consistency across providers
   */
  protected constructPrompt(options: ResolvedLLMOptions): Array<{
    role: string;
    content: string;
  }> {
    if (options.messages && options.messages.length > 0) {
      return options.messages;
    }

    if (options.prompt) {
      return [{ role: 'user', content: options.prompt }];
    }

    throw new Error('Either messages or prompt must be provided');
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async retryWithBackoff(
    fn: () => Promise<LLMResponseDto>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
  ): Promise<LLMResponseDto> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Check if error is retryable (e.g., rate limit, timeout)
   */
  protected isRetryableError(error: any): boolean {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    const retryableMessages = ['timeout', 'rate_limit', 'overloaded'];

    if (error.status && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Rate limit handling
   */
  protected async handleRateLimit(
    retryAfterSeconds: number,
  ): Promise<void> {
    const delayMs = Math.min(retryAfterSeconds * 1000, 60000); // Cap at 60s
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
