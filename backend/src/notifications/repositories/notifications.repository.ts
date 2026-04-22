/**
 * Notifications Repository
 * Custom queries for notification operations
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private repository: Repository<Notification>,
  ) {}

  /**
   * Create notification
   */
  async create(notification: Partial<Notification>): Promise<Notification> {
    const newNotification = this.repository.create(notification);
    return this.repository.save(newNotification);
  }

  /**
   * Get notification by ID
   */
  async getById(id: string): Promise<Notification> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get user notifications (paginated)
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        readAt: null,
        dismissed: false,
      },
    });
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    return this.repository.find({
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
   * Get notifications by type
   */
  async getByType(
    userId: string,
    type: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.repository.findAndCount({
      where: { userId, type: type as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }

  /**
   * Get notifications by priority
   */
  async getByPriority(
    userId: string,
    priority: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.repository.findAndCount({
      where: { userId, priority: priority as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }

  /**
   * Mark as read
   */
  async markAsRead(id: string): Promise<void> {
    await this.repository.update({ id }, { readAt: new Date() });
  }

  /**
   * Mark all as read for user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository.update(
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
  async dismiss(id: string): Promise<void> {
    await this.repository.update({ id }, { dismissed: true });
  }

  /**
   * Dismiss all for user
   */
  async dismissAll(userId: string): Promise<number> {
    const result = await this.repository.update(
      { userId, dismissed: false },
      { dismissed: true },
    );
    return result.affected || 0;
  }

  /**
   * Delete by ID
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  /**
   * Delete by user and type
   */
  async deleteByUserAndType(userId: string, type: string): Promise<number> {
    const result = await this.repository.delete({ userId, type: type as any });
    return result.affected || 0;
  }

  /**
   * Get statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalNotifications: number;
    totalUnread: number;
    byType: any[],
    byPriority: any[]
  }> {
    const query = this.repository.createQueryBuilder('n');

    if (startDate && endDate) {
      query.where('n.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const totalNotifications = await query.getCount();

    const totalUnread = await this.repository.count({
      where: {
        readAt: null,
        dismissed: false,
      },
    });

    const byType = await this.repository
      .createQueryBuilder('n')
      .select('n.type', 'type')
      .addSelect('COUNT(n.id)', 'count')
      .groupBy('n.type')
      .getRawMany();

    const byPriority = await this.repository
      .createQueryBuilder('n')
      .select('n.priority', 'priority')
      .addSelect('COUNT(n.id)', 'count')
      .groupBy('n.priority')
      .getRawMany();

    return { totalNotifications, totalUnread, byType, byPriority };
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository.delete({
      dismissed: true,
      readAt: Between(new Date(0), cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Get recent activity (cross-user)
   */
  async getRecentActivity(limit: number = 100): Promise<Notification[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get critical unread notifications across all users
   */
  async getCriticalUnread(): Promise<Notification[]> {
    return this.repository.find({
      where: {
        priority: 'critical',
        readAt: null,
        dismissed: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Search notifications
   */
  async search(
    userId: string,
    query: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const [notifications, total] = await this.repository.findAndCount({
      where: [
        { userId, title: `%${query}%` },
        { userId, message: `%${query}%` },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { notifications, total };
  }
}
