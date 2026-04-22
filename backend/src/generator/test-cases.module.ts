/**
 * Test Cases & Generation Module
 * Exposes the generation queue and test case management endpoints for Swagger
 */

import { Module } from '@nestjs/common';
import { GenerationController } from './controllers/generation.controller';
import { TestCasesController } from './controllers/test-cases.controller';
import { CommonModule } from '../common/common.module';
import { GeneratorModule } from './generator.module';

@Module({
  imports: [CommonModule, GeneratorModule],
  controllers: [GenerationController, TestCasesController],
})

export class TestCasesModule {}
