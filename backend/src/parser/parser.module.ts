/**
 * Parser Feature Module
 * Provides requirement field extraction using Groq LLM
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ParserService } from './services/parser.service';
import { ParserRepository } from './repositories/parser.repository';
import { ParserController } from './parser.controller';

import { CommonModule } from '../common/common.module';
import { ConfigModule } from '../config/config.module';
import { JiraModule } from '../jira/jira.module';
import { LLMModule } from '../llm/llm.module';


@Module({
  imports: [
    EventEmitterModule,
    CommonModule,
    ConfigModule,
    JiraModule,
    LLMModule,
  ],
  controllers: [ParserController],
  providers: [ParserService, ParserRepository],
  exports: [ParserService, ParserRepository],
})
export class ParserModule {}
