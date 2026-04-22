/**
 * Notification Channel Abstraction Interface
 * Defines the contract for different notification channels (email, Slack, in-app, etc.)
 */

export enum NotificationType {
  TICKET_DETECTED = 'ticket_detected',
  GENERATION_COMPLETE = 'generation_complete',
  GENERATION_FAILED = 'generation_failed',
  APPROVAL_NEEDED = 'approval_needed',
  BUDGET_ALERT = 'budget_alert',
  EXPORT_READY = 'export_ready',
}

export interface NotificationMetadata {
  [key: string]: any;
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  actionUrl?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt: Date;
}

export interface INotificationChannel {
  /**
   * Channel identifier (e.g., 'email', 'slack', 'in-app')
   */
  readonly channelName: string;

  /**
   * Check if channel is available/healthy
   * @returns Promise<boolean>
   */
  isAvailable(): Promise<boolean>;

  /**
   * Send notification via this channel
   * @param payload Notification payload
   * @returns Promise<SendResult>
   */
  send(payload: NotificationPayload): Promise<SendResult>;

  /**
   * Send bulk notifications
   * @param payloads Array of notification payloads
   * @returns Promise<SendResult[]>
   */
  sendBulk?(payloads: NotificationPayload[]): Promise<SendResult[]>;

  /**
   * Get supported notification types
   * @returns NotificationType[]
   */
  getSupportedTypes(): NotificationType[];

  /**
   * Validate payload before sending
   * @param payload Notification payload
   * @returns Promise<{valid: boolean; errors?: string[]}>
   */
  validate(
    payload: NotificationPayload,
  ): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Get channel display name
   * @returns string
   */
  getDisplayName(): string;
}
