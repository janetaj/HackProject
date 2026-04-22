/**
 * Base Notification Channel
 * Abstract class for notification delivery implementations
 */

import { NotificationType, NotificationPriority } from '../dto/notification-response.dto';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: any;
}

export abstract class BaseNotificationChannel {
  /**
   * Send notification through this channel
   */
  abstract send(payload: NotificationPayload): Promise<boolean>;

  /**
   * Get channel name (e.g., 'in-app', 'email', 'slack')
   */
  abstract getName(): string;

  /**
   * Check if channel is available/configured
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Determine if notification should be sent through this channel
   * based on priority, type, and user preferences
   */
  shouldSend(payload: NotificationPayload): boolean {
    // Override in subclasses for custom logic
    return true;
  }

  /**
   * Format notification message for this channel
   */
  protected formatMessage(payload: NotificationPayload): string {
    return `[${payload.type.toUpperCase()}] ${payload.title}: ${payload.message}`;
  }

  /**
   * Log notification send attempt
   */
  protected logSend(payload: NotificationPayload, success: boolean): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    console.log(
      `[${this.getName().toUpperCase()}] Notification ${status}: ${payload.type} to user ${payload.userId}`,
    );
  }

  /**
   * Retry logic helper
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(delayMs * attempt);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
