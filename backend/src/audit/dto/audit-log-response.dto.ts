/**
 * Audit Log Response DTO
 * Response payload for audit log operations
 */

import { IsString, IsEnum, IsOptional, IsDate, IsUUID, IsObject, IsIP } from 'class-validator';

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  GENERATE = 'generate',
  APPROVE_TEST_CASE = 'approve_test_case',
  REJECT_TEST_CASE = 'reject_test_case',
  REGENERATE = 'regenerate',
  EXPORT = 'export',
  DELETE = 'delete',
  UPDATE = 'update',
  CREATE = 'create',
  CONFIG_CHANGE = 'config_change',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  JIRA_SYNC = 'jira_sync',
  CANCEL_JOB = 'cancel_job',
}

export enum AuditEntity {
  USER = 'user',
  TEST_CASE = 'test_case',
  TEST_STEP = 'test_step',
  GENERATION_JOB = 'generation_job',
  EXPORT_HISTORY = 'export_history',
  JIRA_TICKET = 'jira_ticket',
  NOTIFICATION = 'notification',
  CHAT_SESSION = 'chat_session',
  CONFIG = 'config',
}

/**
 * Audit Log Response DTO
 */
export class AuditLogResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsEnum(AuditAction)
  action: AuditAction;

  @IsEnum(AuditEntity)
  entity: AuditEntity;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  beforeSnapshot?: Record<string, any>;

  @IsOptional()
  @IsObject()
  afterSnapshot?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsString()
  status: 'success' | 'failure';

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsDate()
  createdAt: Date;
}

/**
 * Audit log list with pagination
 */
export class AuditLogListDto {
  logs: AuditLogResponseDto[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

/**
 * Audit trail for compliance export
 */
export class AuditTrailExportDto {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalLogs: number;
  actionBreakdown: Record<string, number>;
  userBreakdown: Record<string, number>;
  logs: AuditLogResponseDto[];
}
