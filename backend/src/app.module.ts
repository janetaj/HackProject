/**
 * App Module
 * Root NestJS module that imports and configures all feature modules
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';

// Common & Infrastructure
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

// Core Features
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JiraModule } from './jira/jira.module';
import { ParserModule } from './parser/parser.module';
import { LLMModule } from './llm/llm.module';

// Main Feature Modules
import { GeneratorModule } from './generator/generator.module';
import { ExportModule } from './export/export.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TestCasesModule } from './generator/test-cases.module';
import { SettingsModule } from './config/settings.module';

// Database entities
import { User } from './users/entities/user.entity';
import { JiraTicket } from './jira/entities/jira-ticket.entity';
import { TestCase } from './generator/entities/test-case.entity';
import { TestStep } from './generator/entities/test-step.entity';
import { Notification } from './notifications/entities/notification.entity';
import { ExportHistory } from './export/entities/export-history.entity';
import { ChatSession } from './chatbot/entities/chat-session.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { AppNavigationMenu } from './common/entities/app-navigation-menu.entity';
import { ChatMessage } from './chatbot/entities/chat-message.entity';
import { DataRefresh } from './common/entities/datarefresh.entity';
import { ExportJob } from './export/entities/export-job.entity';
import { GenerationJob } from './generator/entities/generation-job.entity';
import { JiraProject } from './jira/entities/jira-project.entity';
import { MaintenanceSchedule } from './common/entities/maintenance-schedule.entity';
import { SalesDetails } from './common/entities/salesdetails.entity';
import { TokenUsage } from './common/entities/token-usage.entity';

@Module({
  imports: [
    /**
     * Configuration Module
     * Must be imported first and set isGlobal to true
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.local',
      cache: true,
    }),

    /**
     * Database Configuration
     * TypeORM for PostgreSQL (Supabase or local)
     */
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isSupabase = configService.get('DB_HOST', '').includes('supabase.co');
        const sslConfig = isSupabase
          ? {
              rejectUnauthorized: false, // Supabase uses self-signed certificates
            }
          : false;

        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USER', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_NAME', 'ai_test_generator'),
          entities: [
            User,
            JiraTicket,
            TestCase,
            TestStep,
            Notification,
            ExportHistory,
            ChatSession,
            AuditLog,
            AppNavigationMenu,
            ChatMessage,
            DataRefresh,
            ExportJob,
            GenerationJob,
            JiraProject,
            MaintenanceSchedule,
            SalesDetails,
            TokenUsage,
          ],
          synchronize: true, // Enabled for dev mode to correctly build tables and resolve relation errors
          logging: process.env.NODE_ENV !== 'production' ? ['query', 'error'] : ['error'],
          maxQueryExecutionTime: 1000, // Log slow queries
          ssl: sslConfig,
          extra: isSupabase
            ? {
                // Connection pooling settings for Supabase
                max: configService.get('DB_POOL_MAX', 10),
                min: configService.get('DB_POOL_MIN', 2),
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
              }
            : {},
        };
      },
    }),

    /**
     * Redis Configuration
     * For caching and general storage
     */
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`,
        options: {
          password: configService.get('REDIS_PASSWORD'),
          db: 0,
          enableOfflineQueue: false,
          connectTimeout: 5000,
        },

      }),
    }),

    /**
     * Redis Configuration
     * Bull queue, caching, sessions
     */
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          maxRetriesPerRequest: null,
          enableOfflineQueue: false, // Don't queue commands if Redis is down
          connectTimeout: 5000, // Fail after 5 seconds
        },

      }),
    }),


    /**
     * Event Emitter
     * Async event-driven communication between modules
     */
    EventEmitterModule.forRoot({
      wildcard: true,
      maxListeners: 100,
    }),

    /**
     * Feature Modules (Import Order Matters - Dependencies First)
     */

    // Phase 1: Common & Infrastructure
    CommonModule,
    HealthModule,

    // Phase 2: Authentication & Users
    AuthModule,
    UsersModule,

    // Phase 3: Jira & Parsing
    JiraModule,
    ParserModule,

    // Phase 4: LLM Abstraction (Core dependency for generation)
    LLMModule,

    // Phase 5: Core Generation
    GeneratorModule,

    // Phase 6: Supporting Features (Parallelizable)
    ExportModule,
    NotificationsModule,
    ChatbotModule,
    AuditModule,

    // Phase 6b: Test Cases & Generation Queue (Swagger stubs)
    TestCasesModule,

    // Phase 6c: Admin Settings
    SettingsModule,

    // Phase 7: Analytics
    DashboardModule,
  ],

  providers: [],
  exports: [],
})
export class AppModule {
  constructor(private configService: ConfigService) {
    this.logStartupInfo();
  }

  /**
   * Log startup configuration
   */
  private logStartupInfo(): void {
    const environment = this.configService.get('NODE_ENV', 'development');
    const dbHost = this.configService.get('DB_HOST', 'localhost');
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');

    console.log(`
╔═════════════════════════════════════════════════════════════╗
║          AI Test Case Generator - Backend API              ║
╠═════════════════════════════════════════════════════════════╣
║ Environment: ${environment.padEnd(51)} ║
║ Database:    PostgreSQL @ ${dbHost}${' '.repeat(Math.max(0, 52 - 23 - dbHost.length))} ║
║ Cache:       Redis @ ${redisHost}${' '.repeat(Math.max(0, 52 - 19 - redisHost.length))} ║
║ Port:        3000                                            ║
║ API Path:    /api/v1                                         ║
╠═════════════════════════════════════════════════════════════╣
║ Modules Loaded:                                              ║
║  ✓ Auth & Users          ✓ Jira & Parser                    ║
║  ✓ LLM & Generator       ✓ Export & Notifications           ║
║  ✓ Chatbot & Audit       ✓ Dashboard & Health               ║
╚═════════════════════════════════════════════════════════════╝
    `);
  }
}
