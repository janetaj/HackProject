/**
 * OpenAI LLM Provider
 * Adapter for OpenAI GPT-4o and other models
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseLLMProvider } from './base-llm.provider';
import { LLMOptionsDto, ResolvedLLMOptions } from '../dto/llm-options.dto';
import { LLMResponseDto } from '../dto/llm-response.dto';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OpenAIProvider extends BaseLLMProvider {
  providerName = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: AxiosInstance;
  private apiKey: string;
  private readonly API_BASE = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.API_BASE,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  /**
   * Call OpenAI API
   */
  async call(options: ResolvedLLMOptions): Promise<LLMResponseDto> {
    const startTime = Date.now();
    const responseId = uuidv4();

    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.callOpenAI(options);
      });

      const latencyMs = Date.now() - startTime;
      return {
        ...response,
        id: responseId,
        latency_ms: latencyMs,
      };
    } catch (error) {
      this.logger.error(`OpenAI API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal OpenAI call
   */
  private async callOpenAI(options: ResolvedLLMOptions): Promise<LLMResponseDto> {
    const messages = this.constructPrompt(options);

    const requestBody: any = {
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    };

    if (options.top_p !== undefined) {
      requestBody.top_p = options.top_p;
    }

    if (options.frequency_penalty !== undefined) {
      requestBody.frequency_penalty = options.frequency_penalty;
    }

    if (options.presence_penalty !== undefined) {
      requestBody.presence_penalty = options.presence_penalty;
    }

    if (options.response_format === 'json' || options.response_format === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    if (options.tools) {
      requestBody.tools = options.tools;
      if (options.tool_choice) {
        requestBody.tool_choice = options.tool_choice;
      }
    }

    try {
      const response = await this.client.post('/chat/completions', requestBody);

      const data = response.data;
      const content = data.choices[0]?.message?.content || '';
      const inputTokens = data.usage?.prompt_tokens || 0;
      const outputTokens = data.usage?.completion_tokens || 0;

      // Calculate cost
      const { calculateCostEur } = await import('../dto/llm-response.dto');
      const costEur = calculateCostEur(
        this.providerName,
        options.model,
        inputTokens,
        outputTokens,
      );

      return {
        id: data.id || uuidv4(),
        content,
        model: options.model,
        provider: this.providerName,
        finish_reason: data.choices[0]?.finish_reason,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost_eur: costEur,
        latency_ms: 0, // Will be set by caller
        cached: false,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 30;
        await this.handleRateLimit(parseInt(retryAfter));
        throw error; // Retry will happen in retryWithBackoff
      }

      this.logger.error(
        `OpenAI API error: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`,
      );
      throw new Error(
        `OpenAI API error: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/models', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.warn(`OpenAI health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Estimate tokens using text length heuristic
   * OpenAI: ~1.33 tokens per word, ~4 chars per token average
   */
  async estimateTokens(text: string): Promise<number> {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data
        .filter((m: any) => m.id.includes('gpt'))
        .map((m: any) => m.id);
    } catch (error) {
      this.logger.warn(`Failed to fetch OpenAI models: ${error.message}`);
      return ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    }
  }

  /**
   * Validate options
   */
  validateOptions(options: LLMOptionsDto): boolean {
    if (!options.model) return false;
    if (!options.model.includes('gpt')) return false;
    if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
      return false;
    }
    return true;
  }

  /**
   * Extract response content
   */
  protected extractResponseContent(providerResponse: any): string {
    return providerResponse.choices[0]?.message?.content || '';
  }

  /**
   * Extract token usage
   */
  protected extractTokenUsage(
    providerResponse: any,
  ): { input: number; output: number } {
    return {
      input: providerResponse.usage?.prompt_tokens || 0,
      output: providerResponse.usage?.completion_tokens || 0,
    };
  }

  /**
   * Extract finish reason
   */
  protected extractFinishReason(providerResponse: any): string {
    return providerResponse.choices[0]?.finish_reason || 'unknown';
  }
}
