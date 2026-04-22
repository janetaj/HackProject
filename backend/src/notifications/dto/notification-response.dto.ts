/**
 * Notification Response DTOs
 * Response payloads for notification operations
 */

import { IsString, IsEnum, IsOptional, IsDate, IsUUID, IsObject } from 'class-validator';

export enum NotificationType {
  TICKET_DETECTED = 'ticket_detected',
  GENERATION_COMPLETE = 'generation_complete',
  GENERATION_FAILED = 'generation_failed',
  APPROVAL_NEEDED = 'approval_needed',
  BUDGET_ALERT = 'budget_alert',
  EXPORT_READY = 'export_ready',
  TICKET_UPDATED = 'ticket_updated',
  SYSTEM_ALERT = 'system_alert',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Notification Response DTO
 */
export class NotificationResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @IsOptional()
  @IsObject()
  metadata?: {
    ticketId?: string;
    jiraKey?: string;
    jobId?: string;
    exportId?: string;
    testCaseId?: string;
    projectKey?: string;
    cost?: number;
    action?: string; // e.g., 'view', 'approve', 'download'
    actionUrl?: string;
  };

  @IsOptional()
  @IsDate()
  readAt?: Date;

  @IsDate()
  createdAt: Date;
}

/**
 * Paginated notification list
 */
export class NotificationListDto {
  notifications: NotificationResponseDto[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
  pages: number;
}

/**
 * Batch notification creation
 */
export class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: any;
}

/**
 * WebSocket message format
 */
export class WebSocketNotificationDto {
  type: 'notification_created' | 'notification_read' | 'unread_count_changed';
  notification?: NotificationResponseDto;
  unreadCount?: number;
  timestamp: Date;
}
