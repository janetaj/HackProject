/**
 * Dashboard Module
 * Analytics and metrics aggregation
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';
import { User } from '../users/entities/user.entity';
import { TestCase } from '../generator/entities/test-case.entity';
import { JiraTicket } from '../jira/entities/jira-ticket.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TestCase,
      JiraTicket,
      AuditLog,
      Notification,
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
