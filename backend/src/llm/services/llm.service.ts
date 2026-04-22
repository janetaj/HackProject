/**
 * LLM Service
 * Unified interface for calling any LLM provider with caching, budget checks, fallback logic
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OpenAIProvider } from '../providers/openai.provider';
import { GroqProvider } from '../providers/groq.provider';
import { BaseLLMProvider } from '../providers/base-llm.provider';
import { TokenTrackerService } from './token-tracker.service';
import { BudgetManagerService } from './budget-manager.service';
import { LLMOptionsDto, LLMProvider, ResolvedLLMOptions } from '../dto/llm-options.dto';
import { LLMResponseDto } from '../dto/llm-response.dto';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private openaiProvider: OpenAIProvider;
  private groqProvider: GroqProvider;
  private providers: Map<string, BaseLLMProvider>;
  private readonly CACHE_PREFIX = 'llm_cache:';
  private readonly CACHE_TTL = 86400; // 24 hours

  constructor(
    private tokenTracker: TokenTrackerService,
    private budgetManager: BudgetManagerService,
    @InjectRedis() private redisClient: Redis,
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize LLM providers
   */
  private initializeProviders(): void {
    const openaiApiKey = process.env.OPENAI_API_KEY || '';
    const groqApiKey = process.env.GROQ_API_KEY || '';

    this.openaiProvider = new OpenAIProvider(openaiApiKey);
    this.groqProvider = new GroqProvider(groqApiKey);

    this.providers = new Map();
    this.providers.set(LLMProvider.OPENAI, this.openaiProvider);
    this.providers.set(LLMProvider.GROQ, this.groqProvider);

    this.logger.log('LLM providers initialized: OpenAI, Groq');
    
    if (openaiApiKey.includes('placeholder') || groqApiKey.includes('placeholder')) {
      this.logger.warn('Mock mode ENABLED: One or more LLM API keys are placeholders.');
    }
  }

  /**
   * Call LLM with intelligent provider selection
   */
  async call(options: LLMOptionsDto): Promise<LLMResponseDto> {
    try {
      // Resolve options with defaults
      const resolved = this.resolveOptions(options);

      // Check cache
      const cacheKey = this.generateCacheKey(resolved);
      const cached = await this.checkCache(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for request`);
        cached.cached = true;
        return cached;
      }

      // Check budget
      const estimatedTokens = await this.estimateTokens(resolved);
      const estimatedCost = this.tokenTracker.estimateCost(
        estimatedTokens,
        resolved.provider,
        resolved.model,
      );

      const budgetCheck = await this.budgetManager.checkBudget(
        resolved.user_id || 'system',
        estimatedCost,
        resolved.action || 'unknown',
      );

      if (!budgetCheck.allowed) {
        this.logger.warn(`Budget check failed: ${budgetCheck.reason}`);

        // Try fallback provider if available
        if (resolved.provider === LLMProvider.OPENAI) {
          resolved.provider = LLMProvider.GROQ;
          this.logger.log('Falling back to Groq due to budget constraints');
        } else {
          throw new BadRequestException(budgetCheck.reason);
        }
      }

      // Check if we should use mock logic
      const openaiApiKey = process.env.OPENAI_API_KEY || '';
      const groqApiKey = process.env.GROQ_API_KEY || '';
      const isMockMode = (resolved.provider === LLMProvider.OPENAI && openaiApiKey.includes('placeholder')) ||
                        (resolved.provider === LLMProvider.GROQ && groqApiKey.includes('placeholder'));

      let response: LLMResponseDto;

      if (isMockMode) {
        this.logger.debug(`Generating mock response for ${resolved.provider}`);
        response = this.generateMockResponse(resolved);
      } else {
        // Get provider
        const provider = this.providers.get(resolved.provider);
        if (!provider) {
          throw new Error(`Provider ${resolved.provider} not found`);
        }
        // Call provider
        response = await provider.call(resolved);
      }

      // Record token usage
      if (resolved.user_id) {
        await this.tokenTracker.recordUsage(
          response,
          resolved.user_id,
          resolved.action || 'unknown',
        );

        // Record spending against budget
        await this.budgetManager.recordSpending(
          resolved.user_id,
          response.cost_eur,
          resolved.action || 'unknown',
        );
      }

      // Cache response
      await this.cacheResponse(cacheKey, response);

      return response;
    } catch (error) {
      this.logger.error(`LLM call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch call multiple prompts
   */
  async batchCall(
    prompts: LLMOptionsDto[],
    userId: string,
    action: string,
  ): Promise<LLMResponseDto[]> {
    const results: LLMResponseDto[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < prompts.length; i++) {
      try {
        const response = await this.call({
          ...prompts[i],
          user_id: userId,
          action,
        });
        results.push(response);
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    if (errors.length > 0) {
      this.logger.warn(
        `Batch call had ${errors.length} errors: ${JSON.stringify(errors)}`,
      );
    }

    return results;
  }

  /**
   * Stream LLM response (for long-running operations)
   */
  async *stream(
    options: LLMOptionsDto,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const resolved = this.resolveOptions(options);
      const provider = this.providers.get(resolved.provider);

      if (!provider) {
        throw new Error(`Provider ${resolved.provider} not found`);
      }

      // Note: Streaming requires Provider-specific implementation
      // For now, return complete response in chunks
      const response = await provider.call(resolved);
      yield response.content;
    } catch (error) {
      this.logger.error(`Stream failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve options with defaults
   */
  private resolveOptions(options: LLMOptionsDto): ResolvedLLMOptions {
    const resolved: ResolvedLLMOptions = {
      ...options,
      model: options.model || 'gpt-4o',
      provider: options.provider || LLMProvider.OPENAI,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      timeout: options.timeout ?? 60000,
    };

    // Validate
    const provider = this.providers.get(resolved.provider);
    if (!provider || !provider.validateOptions(resolved)) {
      throw new BadRequestException(
        `Invalid options for provider ${resolved.provider}`,
      );
    }

    return resolved;
  }

  /**
   * Estimate tokens for budget checking
   */
  private async estimateTokens(options: ResolvedLLMOptions): Promise<number> {
    const provider = this.providers.get(options.provider);
    if (!provider) {
      return 100; // Default estimate
    }

    const content = options.messages
      ? options.messages.map((m) => m.content).join('\n')
      : options.prompt || '';

    return provider.estimateTokens(content);
  }

  /**
   * Generate cache key from options
   */
  private generateCacheKey(options: ResolvedLLMOptions): string {
    const content =
      options.messages
        ? JSON.stringify(options.messages)
        : options.prompt || '';

    const key = `${options.model}_${options.provider}_${options.temperature}`;
    const hash = crypto
      .createHash('sha256')
      .update(content + key)
      .digest('hex');

    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Check cache for response
   */
  private async checkCache(cacheKey: string): Promise<LLMResponseDto | null> {
    try {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache check failed: ${error.message}`);
    }
    return null;
  }

  /**
   * Cache response
   */
  private async cacheResponse(
    cacheKey: string,
    response: LLMResponseDto,
  ): Promise<void> {
    try {
      await this.redisClient.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(response),
      );
    } catch (error) {
      this.logger.warn(`Cache write failed: ${error.message}`);
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{
    openai: boolean;
    groq: boolean;
    cache: boolean;
  }> {
    const [openaiHealth, groqHealth] = await Promise.all([
      this.openaiProvider.healthCheck().catch(() => false),
      this.groqProvider.healthCheck().catch(() => false),
    ]);

    let cacheHealth = true;
    try {
      await this.redisClient.ping();
    } catch {
      cacheHealth = false;
    }

    return {
      openai: openaiHealth,
      groq: groqHealth,
      cache: cacheHealth,
    };
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<{
    openai: string[];
    groq: string[];
  }> {
    const [openaiModels, groqModels] = await Promise.all([
      this.openaiProvider.getAvailableModels().catch(() => []),
      this.groqProvider.getAvailableModels().catch(() => []),
    ]);

    return {
      openai: openaiModels,
      groq: groqModels,
    };
  }

  /**
   * Clear cache (admin only)
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
      this.logger.log(`Cleared ${keys.length} cache entries`);
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * Generate mock response for development
   */
  private generateMockResponse(options: ResolvedLLMOptions): LLMResponseDto {
    const isParsing = options.messages?.some(m => m.content.toLowerCase().includes('parse') || m.content.toLowerCase().includes('requirement'));
    
    let content = 'Mock response from LLM service.';
    
    if (isParsing) {
      content = JSON.stringify({
        story_id: `STORY-${Math.floor(Math.random() * 1000)}`,
        title: 'Mock Parsed Ticket',
        module: 'Core',
        description: 'Auto-extracted requirement description (Mock)',
        acceptance_criteria: [
          'The system shall perform the expected action',
          'The UI shall display the success message',
          'Data shall be persisted in the database'
        ],
        headers: ['Scenario', 'Given', 'When', 'Then'],
        test_focus: 'Functional',
        edge_cases: 'Empty inputs',
        boundary_conditions: 'Maximum limits'
      });
    } else {
      content = `Mock test case generation response.
      
Scenario: Successful test run
Given a valid input
When the process is triggered
Then the output should be correct.`;
    }

    return {
      id: `mock-${uuidv4()}`,
      content,
      model: options.model,
      provider: options.provider,
      finish_reason: 'stop',
      tokens: {
        input: 100,
        output: 200,
        total: 300
      },
      cost_eur: 0,
      latency_ms: 50,
      cached: false,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Get provider info
   */
  getProviderInfo(provider: LLMProvider): { name: string; models: string[] } | null {
    const providerObj = this.providers.get(provider);
    if (!providerObj) {
      return null;
    }

    return {
      name: providerObj.providerName,
      models: [], // TODO: Get from provider
    };
  }
}
