/**
 * LLM Call Options DTO
 * Defines options for calling any LLM provider
 */

import { IsString, IsNumber, IsOptional, Min, Max, IsEnum } from 'class-validator';

export enum LLMProvider {
  OPENAI = 'openai',
  GROQ = 'groq',
}

export class LLMOptionsDto {
  @IsString()
  @IsOptional()
  model?: string; // e.g., 'gpt-4o', 'mixtral-8x7b-32768'

  @IsString()
  prompt?: string; // Deprecated: use messages instead

  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;

  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number; // Defaults: 0.7 for general, 0.3 for parsing

  @IsNumber()
  @Min(1)
  max_tokens?: number; // Token budget for response

  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number; // Nucleus sampling

  @IsNumber()
  @Min(-2)
  @Max(2)
  frequency_penalty?: number; // Reduce repetition

  @IsNumber()
  @Min(-2)
  @Max(2)
  presence_penalty?: number; // Encourage new tokens

  @IsEnum(LLMProvider)
  provider?: LLMProvider; // Explicit provider selection (optional: auto-select via config)

  @IsOptional()
  @IsNumber()
  timeout?: number; // Timeout in milliseconds

  @IsOptional()
  @IsString()
  user_id?: string; // For usage tracking and per-user limits

  @IsOptional()
  @IsString()
  action?: string; // Type of action (parse, generate, chatbot) for tracking

  @IsOptional()
  @IsString()
  tool_choice?: string; // For function calling

  @IsOptional()
  tools?: any[]; // Function definitions for tool use

  @IsOptional()
  @IsString()
  response_format?: string; // e.g., 'json_object' for JSON mode
}

/**
 * Options with defaults applied
 */
export interface ResolvedLLMOptions extends LLMOptionsDto {
  model: string;
  provider: LLMProvider;
  temperature: number;
  max_tokens: number;
  timeout: number;
}

/**
 * Builder pattern for LLM options
 */
export class LLMOptionsBuilder {
  private options: LLMOptionsDto = {};

  model(model: string): this {
    this.options.model = model;
    return this;
  }

  messages(role: string, content: string): this {
    if (!this.options.messages) {
      this.options.messages = [];
    }
    this.options.messages.push({ role: role as any, content });
    return this;
  }

  temperature(temp: number): this {
    this.options.temperature = temp;
    return this;
  }

  maxTokens(tokens: number): this {
    this.options.max_tokens = tokens;
    return this;
  }

  provider(provider: LLMProvider): this {
    this.options.provider = provider;
    return this;
  }

  userId(userId: string): this {
    this.options.user_id = userId;
    return this;
  }

  action(action: string): this {
    this.options.action = action;
    return this;
  }

  responseFormat(format: string): this {
    this.options.response_format = format;
    return this;
  }

  topP(topP: number): this {
    this.options.top_p = topP;
    return this;
  }

  timeout(ms: number): this {
    this.options.timeout = ms;
    return this;
  }

  build(): LLMOptionsDto {
    return this.options;
  }

  static create(): LLMOptionsBuilder {
    return new LLMOptionsBuilder();
  }
}
