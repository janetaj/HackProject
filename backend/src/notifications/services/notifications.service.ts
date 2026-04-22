/**
 * Notifications Service
 * Core business logic for notification management
 */

import { Injectable, BadRequestException, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { InAppNotificationChannel } from '../channels/in-app.channel';
import { NotificationPayload } from '../channels/base-notification.channel';
import {
  NotificationType,
  NotificationPriority,
  NotificationResponseDto,
} from '../dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private repository: NotificationsRepository,
    private inAppChannel: InAppNotificationChannel,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create and send notification
   * Called by event listeners from other modules (Generator, Export, etc.)
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any,
  ): Promise<NotificationResponseDto> {
    try {
      // Prepare payload
      const payload: NotificationPayload = {
        userId,
        type,
        title,
        message,
        priority,
        metadata,
      };

      // Send through in-app channel
      const sent = await this.inAppChannel.send(payload);

      if (!sent) {
        this.logger.warn(
          `Failed to send notification to user ${userId} via in-app channel`,
        );
      }

      // Get created notification
      const notification = await this.repository.getUnreadNotifications(
        userId,
        1,
      );

      if (notification.length === 0) {
        throw new BadRequestException('Failed to create notification');
      }

      const created = notification[0];

      // Emit WebSocket event for real-time delivery
      this.eventEmitter.emit('notification.created', {
        userId,
        notification: this.toDto(created),
      });

      // Emit socket broadcast event (will be picked up by gateway)
      this.eventEmitter.emit('ws.notification.created', {
        userId,
        notification: this.toDto(created),
      });

      return this.toDto(created);
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(
    notifications: Array<{
      userId: string;
      type: NotificationType;
      title: string;
      message: string;
      priority?: NotificationPriority;
      metadata?: any;
    }>,
  ): Promise<NotificationResponseDto[]> {
    const results = [];

    for (const notif of notifications) {
      try {
        const created = await this.createNotification(
          notif.userId,
          notif.type,
          notif.title,
          notif.message,
          notif.priority,
          notif.metadata,
        );
        results.push(created);
      } catch (error) {
        this.logger.error(
          `Failed to create notification for user ${notif.userId}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    unread: number;
    pages: number;
  }> {
    const { notifications, total } = await this.repository.getUserNotifications(
      userId,
      limit,
      offset,
    );
    const unread = await this.repository.getUnreadCount(userId);

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
      unread,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.repository.getUnreadNotifications(
      userId,
      limit,
    );
    return notifications.map((n) => this.toDto(n));
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId);
  }

  /**
   * Get notification by ID
   */
  async getNotification(
    notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.getById(notificationId);

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    return this.toDto(notification);
  }

  /**
   * Mark as read
   */
  async markAsRead(notificationId: string): Promise<NotificationResponseDto> {
    const notification = await this.repository.getById(notificationId);

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    await this.repository.markAsRead(notificationId);

    // Emit update event
    this.eventEmitter.emit('notification.read', {
      userId: notification.userId,
      notificationId,
    });

    const updated = await this.repository.getById(notificationId);
    return this.toDto(updated);
  }

  /**
   * Mark all as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.repository.markAllAsRead(userId);

    this.eventEmitter.emit('notifications.all-read', { userId });

    return count;
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId: string): Promise<void> {
    const notification = await this.repository.getById(notificationId);

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    await this.repository.dismiss(notificationId);

    this.eventEmitter.emit('notification.dismissed', {
      userId: notification.userId,
      notificationId,
    });
  }

  /**
   * Dismiss all for user
   */
  async dismissAll(userId: string): Promise<number> {
    const count = await this.repository.dismissAll(userId);

    this.eventEmitter.emit('notifications.all-dismissed', { userId });

    return count;
  }

  /**
   * Get notifications by type
   */
  async getByType(
    userId: string,
    type: NotificationType,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number }> {
    const { notifications, total } = await this.repository.getByType(
      userId,
      type as string,
      limit,
      offset,
    );

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
    };
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    return this.repository.getStatistics(startDate, endDate);
  }

  /**
   * Cleanup old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const count = await this.repository.cleanupOldNotifications(daysOld);
    this.logger.log(`Cleaned up ${count} old notifications`);
    return count;
  }

  /**
   * Convert entity to DTO
   */
  private toDto(notification: any): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      metadata: notification.metadata,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
