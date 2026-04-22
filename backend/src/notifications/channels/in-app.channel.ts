/**
 * In-App Notification Channel
 * Implementation for in-app (stored in DB) notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BaseNotificationChannel,
  NotificationPayload,
} from './base-notification.channel';
import { Notification } from '../entities/notification.entity';
import { NotificationPriority } from '../dto/notification-response.dto';

@Injectable()
export class InAppNotificationChannel extends BaseNotificationChannel {
  private readonly logger = new Logger(InAppNotificationChannel.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    super();
  }

  getName(): string {
    return 'in-app';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check database connectivity
      await this.notificationRepository.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('In-app channel database check failed:', error);
      return false;
    }
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    return this.retryWithBackoff(async () => {
      try {
        const notification = this.notificationRepository.create({
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority || NotificationPriority.MEDIUM,
          metadata: payload.metadata || {},
          readAt: null,
          dismissed: false,
        });

        await this.notificationRepository.save(notification);

        this.logSend(payload, true);
        return true;
      } catch (error) {
        this.logger.error(
          `Failed to send in-app notification to user ${payload.userId}:`,
          error,
        );
        this.logSend(payload, false);
        throw error;
      }
    });
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId,
        readAt: null,
        dismissed: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      { readAt: new Date() },
    );
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      {
        userId,
        readAt: null,
      },
      { readAt: new Date() },
    );
    return result.affected || 0;
  }

  /**
   * Dismiss notification
   */
  async dismiss(notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      { dismissed: true },
    );
  }

  /**
   * Dismiss all notifications for user
   */
  async dismissAll(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      {
        userId,
        dismissed: false,
      },
      { dismissed: true },
    );
    return result.affected || 0;
  }

  /**
   * Get user's recent notifications
   */
  async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.notificationRepository.findAndCount(
      {
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      },
    );

    return { notifications, total };
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: {
        userId,
        readAt: null,
        dismissed: false,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      dismissed: true,
      readAt: cutoffDate,
    });

    return result.affected || 0;
  }
}
