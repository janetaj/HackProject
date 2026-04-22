/**
 * Generator Module
 * Test case generation feature module with BullMQ async processing
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { GeneratorController } from './controllers/generator.controller';
import { GeneratorService } from './services/generator.service';
import { GeneratorWorkerProcessor } from './processors/generator-worker.processor';
import { GeneratorRepository } from './repositories/generator.repository';
import { TestCase } from './entities/test-case.entity';
import { TestStep } from './entities/test-step.entity';

// Import dependencies from other modules
import { CommonModule } from '../common/common.module';
import { JiraModule } from '../jira/jira.module';
import { LLMModule } from '../llm/llm.module';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [
    // Database
    TypeOrmModule.forFeature([TestCase, TestStep]),

    // Job Queue
    BullModule.registerQueue({
      name: 'test-generation-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),

    // Event Emitter for async communication
    EventEmitterModule,

    // Dependent modules
    CommonModule,
    JiraModule,
    LLMModule,
    ParserModule,
  ],

  controllers: [GeneratorController],

  providers: [
    GeneratorService,
    GeneratorRepository,
    GeneratorWorkerProcessor,
  ],

  exports: [GeneratorService, GeneratorRepository],
})
export class GeneratorModule {}
