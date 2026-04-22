/**
 * LLM Feature Module
 * Provides unified LLM interface with budget management, token tracking, and provider abstraction
 */

import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';

import { LLMService } from './services/llm.service';
import { TokenTrackerService } from './services/token-tracker.service';
import { BudgetManagerService } from './services/budget-manager.service';

import { OpenAIProvider } from './providers/openai.provider';
import { GroqProvider } from './providers/groq.provider';

import { CommonModule } from '../common/common.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RedisModule, CommonModule, ConfigModule, UsersModule],
  providers: [
    LLMService,
    TokenTrackerService,
    BudgetManagerService,
  ],
  exports: [LLMService, TokenTrackerService, BudgetManagerService],
})
export class LLMModule {}
