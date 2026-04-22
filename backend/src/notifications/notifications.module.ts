/**
 * Notifications Module
 * Real-time and in-app notification management
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { Notification } from './entities/notification.entity';

// Notification Channels
import { InAppNotificationChannel } from './channels/in-app.channel';

// Import dependencies
import { CommonModule } from '../common/common.module';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    // Database
    TypeOrmModule.forFeature([Notification]),

    // Event Emitter for internal communication
    EventEmitterModule.forRoot(),

    // Common utilities
    CommonModule,

    // JWT for gateway authentication
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],

  controllers: [NotificationsController],

  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsGateway,
    InAppNotificationChannel,
    JwtService,
  ],

  exports: [NotificationsService, NotificationsRepository, NotificationsGateway],
})
export class NotificationsModule {}
