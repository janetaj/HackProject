/**
 * Parser Service
 * Core parsing logic for extracting structured requirements from Jira tickets
 */

import { Injectable, Logger } from '@nestjs/common';
import { JiraService } from '../../jira/services/jira.service';
import { ParserRepository } from '../repositories/parser.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LLMService } from '../../llm/services/llm.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import * as Redis from 'ioredis';
import {
  generateParsingPrompt,
  getSystemPrompt,
  GROQ_PARSER_CONFIG,
  extractJsonFromResponse,
  validateMinimumRequirements,
  generateFallbackParsed,
} from '../templates/parser-prompt.template';
import {
  ParsedRequirementSchema,
  ParsedRequirement,
} from '../dto/parsed-requirement.dto';

interface LLMProvider {
  call(options: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    max_tokens: number;
  }): Promise<{
    content: string;
    tokens: { input: number; output: number };
  }>;
}

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly REDIS_CACHE_TTL = 86400; // 24 hours
  private readonly REDIS_CACHE_PREFIX = 'parser:';
  private readonly MAX_RETRIES = 2;

  constructor(
    private jiraService: JiraService,
    private parserRepository: ParserRepository,
    private eventEmitter: EventEmitter2,
    private llmService: LLMService,
  ) {
    // Initialize Redis client
    // this.redisClient = new Redis({
    //   host: process.env.REDIS_HOST || 'localhost',
    //   port: parseInt(process.env.REDIS_PORT || '6379'),
    //   password: process.env.REDIS_PASSWORD,
    // });
  }

  /**
   * Parse a single Jira ticket
   * Returns parsed requirement or null if parsing fails after retries
   */
  async parseTicket(ticketId: string, force: boolean = false): Promise<ParsedRequirement | null> {
    try {
      // Check cache first (unless force=true)
      if (!force) {
        const cached = await this.getCachedParsing(ticketId);
        if (cached) {
          this.logger.debug(`Cache hit for ticket ${ticketId}`);
          await this.parserRepository.markCacheHit(ticketId);
          return cached;
        }
      }

      // Fetch ticket from Jira module
      const ticket = await this.jiraService.getTicketById(ticketId);
      if (!ticket) {
        this.logger.error(`Ticket not found: ${ticketId}`);
        return null;
      }

      // Create parsing record
      const parsingRecord = await this.parserRepository.createParsingRecord(
        ticket.id,
        ticket.jira_key,
        'parsing',
      );

      // Parse ticket with retries
      let parsedData: ParsedRequirement | null = null;
      let lastError: Error | null = null;
      let totalTokensUsed = 0;

      for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const result = await this.callGroqParser({
            id: ticket.id,
            jiraKey: ticket.jira_key,
            summary: ticket.summary,
            description: ticket.description,
            rawContent: ticket.raw_content,
          });

          parsedData = result.parsed;
          totalTokensUsed = result.tokensUsed;
          break;
        } catch (error) {
          lastError = error;
          this.logger.warn(
            `Parsing attempt ${attempt + 1} failed for ${ticket.jira_key}: ${error.message}`,
          );

          if (attempt < this.MAX_RETRIES) {
            // Exponential backoff: 1s, 2s
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      if (!parsedData) {
        // All retries failed, use fallback
        this.logger.warn(`All parsing attempts failed for ${ticket.jira_key}, using fallback`);
        parsedData = this.generateFallbackParsing(ticketId, {
          jiraKey: ticket.jira_key,
          summary: ticket.summary,
          description: ticket.description,
        });

        // Update repository with failure
        await this.parserRepository.updateParsingFailure(
          parsingRecord.id,
          lastError?.message || 'Unknown parsing error',
          totalTokensUsed,
        );

        // Emit failure event
        this.eventEmitter.emit('parser.ticket.failed', {
          ticketId: ticket.id,
          jiraKey: ticket.jira_key,
          error: lastError?.message,
        });

        return null;
      }

      // Cache the parsed result
      await this.cacheParsing(ticketId, parsedData);

      // Update repository with success
      await this.parserRepository.updateParsingSuccess(
        parsingRecord.id,
        parsedData,
        totalTokensUsed,
      );

      // Update Jira ticket with parsed fields
      await this.jiraService.updateTicketParsedContent(ticket.id, parsedData);

      // Emit success event
      this.eventEmitter.emit('parser.ticket.parsed', {
        ticketId: ticket.id,
        jiraKey: ticket.jira_key,
        parsedData,
      });

      this.logger.log(`Successfully parsed ticket ${ticket.jira_key}`);
      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing ticket ${ticketId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse multiple tickets
   */
  async parseMultipleTickets(
    ticketIds: string[],
    force: boolean = false,
  ): Promise<Map<string, ParsedRequirement | null>> {
    const results = new Map<string, ParsedRequirement | null>();

    for (const ticketId of ticketIds) {
      try {
        const parsed = await this.parseTicket(ticketId, force);
        results.set(ticketId, parsed);
      } catch (error) {
        this.logger.error(`Error parsing ticket ${ticketId}: ${error.message}`);
        results.set(ticketId, null);
      }
    }

    return results;
  }

  /**
   * Call Groq parser via LLM service
   */
  private async callGroqParser(ticket: {
    id: string;
    jiraKey: string;
    summary: string;
    description: string;
    rawContent?: any;
  }): Promise<{
    parsed: ParsedRequirement;
    tokensUsed: number;
  }> {
    try {
      const prompt = generateParsingPrompt(ticket);
      const systemPrompt = getSystemPrompt();

      const response = await this.llmService.call({
        model: GROQ_PARSER_CONFIG.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: GROQ_PARSER_CONFIG.temperature,
        max_tokens: GROQ_PARSER_CONFIG.maxTokens,
        provider: 'groq' as any,
      });

      // Extract JSON from response
      const parsed = extractJsonFromResponse(response.content);

      // Validate with Zod schema
      const validatedParsed = ParsedRequirementSchema.parse({
        ...parsed,
        ticket_id: ticket.id,
        parsed_at: new Date().toISOString(),
        parser_version: '1.0.0',
        raw_ai_response: response.content,
      });

      return {
        parsed: validatedParsed,
        tokensUsed: response.tokens?.output || 0,
      };
    } catch (error) {
      this.logger.error(`Groq parsing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mock Groq call for MVP (replace with real LLM call)
   */
  private async mockGroqCall(
    ticket: any,
    prompt: string,
  ): Promise<{ content: string; tokens?: any }> {
    // Generate realistic mock response
    const mockResponse = {
      story_id: `STORY-${Math.floor(Math.random() * 1000)}`,
      title: ticket.summary.substring(0, 50),
      module: 'Core Functionality',
      description: ticket.description,
      acceptance_criteria: [
        `${ticket.summary} should be implemented`,
        'Code should be tested',
        'Documentation should be updated',
      ],
      headers: ['Given', 'When', 'Then'],
      test_focus: 'Functional correctness',
      edge_cases: 'Null inputs, empty strings',
      boundary_conditions: 'Max attempts 3',
    };

    return {
      content: JSON.stringify(mockResponse),
      tokens: { input: 150, output: 200 },
    };
  }

  /**
   * Get cached parsing result from Redis
   * DISABLED for MVP - Redis client not available
   */
  private async getCachedParsing(ticketId: string): Promise<ParsedRequirement | null> {
    // Redis caching disabled for MVP
    return null;
    // try {
    //   const cached = await this.redisClient.get(
    //     `${this.REDIS_CACHE_PREFIX}${ticketId}`,
    //   );
    //   if (cached) {
    //     return JSON.parse(cached);
    //   }
    // } catch (error) {
    //   this.logger.warn(`Failed to retrieve cache for ticket ${ticketId}: ${error.message}`);
    // }
    // return null;
  }

  /**
   * Cache parsing result in Redis
   * DISABLED for MVP - Redis client not available
   */
  private async cacheParsing(ticketId: string, parsed: ParsedRequirement): Promise<void> {
    // Redis caching disabled for MVP
    // try {
    //   await this.redisClient.setex(
    //     `${this.REDIS_CACHE_PREFIX}${ticketId}`,
    //     this.REDIS_CACHE_TTL,
    //     JSON.stringify(parsed),
    //   );
    // } catch (error) {
    //   this.logger.warn(`Failed to cache parsing for ticket ${ticketId}: ${error.message}`);
    //   // Continue on cache failure - parsing result is still valid
    // }
  }

  /**
   * Generate fallback parsing when LLM fails
   */
  private generateFallbackParsing(
    ticketId: string,
    ticket: any,
  ): ParsedRequirement {
    const fallback = generateFallbackParsed(ticketId, ticket);
    return ParsedRequirementSchema.parse({
      ...fallback,
      ticket_id: ticketId,
      parsed_at: new Date().toISOString(),
      parser_version: '1.0.0-fallback',
    });
  }

  /**
   * Get parsing statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<any> {
    return this.parserRepository.getParsingStatistics(startDate, endDate);
  }

  /**
   * Retry failed parsing jobs
   */
  async retryFailedParsings(maxRetries: number = 3): Promise<number> {
    const failedRecords = await this.parserRepository.getFailedParsingNeedingRetry(maxRetries);
    this.logger.log(`Found ${failedRecords.length} failed parsing records to retry`);

    let retryCount = 0;
    for (const record of failedRecords) {
      const success = await this.parseTicket(record.ticket_id, true);
      if (success) {
        retryCount++;
      }
    }

    return retryCount;
  }

  /**
   * Cleanup old parsing records
   */
  async cleanupOldRecords(daysRetention: number = 90): Promise<number> {
    return this.parserRepository.cleanupOldRecords(daysRetention);
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<any> {
    return this.parserRepository.getCacheStatistics(7);
  }

  /**
   * Clear cache for a ticket
   * DISABLED for MVP - Redis client not available
   */
  async clearCache(ticketId: string): Promise<void> {
    // Redis caching disabled for MVP
    // try {
    //   await this.redisClient.del(`${this.REDIS_CACHE_PREFIX}${ticketId}`);
    // } catch (error) {
    //   this.logger.warn(`Failed to clear cache for ticket ${ticketId}: ${error.message}`);
    // }
  }

  /**
   * Clear all parser cache
   * DISABLED for MVP - Redis client not available
   */
  async clearAllCache(): Promise<void> {
    // Redis caching disabled for MVP
    // try {
    //   const keys = await this.redisClient.keys(`${this.REDIS_CACHE_PREFIX}*`);
    //   if (keys.length > 0) {
    //     await this.redisClient.del(...keys);
    //   }
    // } catch (error) {
    //   this.logger.error(`Failed to clear all cache: ${error.message}`);
    // }
  }
}
