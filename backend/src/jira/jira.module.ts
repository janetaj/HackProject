/**
 * Jira Feature Module
 * Provides Jira Cloud integration with polling, ticket ingestion, and status tracking
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { JiraTicket } from './entities/jira-ticket.entity';
import { JiraRepository } from './repositories/jira.repository';
import { JiraService } from './services/jira.service';
import { JiraPollerService } from './services/jira-poller.service';
import { JiraDedupService } from './services/jira-dedup.service';
import { JiraController } from './controllers/jira.controller';

import { CommonModule } from '../common/common.module';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JiraTicket]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CommonModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [JiraController],
  providers: [JiraService, JiraPollerService, JiraDedupService, JiraRepository],
  exports: [JiraService, JiraPollerService, JiraDedupService, JiraRepository],
})
export class JiraModule {}
