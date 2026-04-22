/**
 * Health Module
 * K8s-compatible health checks and readiness probes
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './controllers/health.controller';
import { HealthService } from './services/health.service';
import { DatabaseIndicator } from './indicators/database.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
// import { LLMIndicator } from './indicators/llm.indicator'; // TODO: Enable when LLMModule is available

@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [HealthService, DatabaseIndicator, RedisIndicator /* LLMIndicator */],
  controllers: [HealthController],
  exports: [HealthService],
})
export class HealthModule {}
