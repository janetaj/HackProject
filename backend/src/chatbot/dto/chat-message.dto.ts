/**
 * Chat Message DTOs
 * Request and response payloads for chat operations
 */

import { IsString, IsUUID, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum Intent {
  QUERY = 'query', // Database/cached queries
  ACTION = 'action', // Trigger generation, approvals, etc.
  JIRA_QUERY = 'jira_query', // Live Jira MCP calls
  HELP = 'help', // Help/documentation
  UNKNOWN = 'unknown', // Unable to classify
}

/**
 * Chat message request DTO
 */
export class ChatMessageDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  context?: string; // Optional context (ticket key, project, etc.)
}

/**
 * Chat response DTO
 */
export class ChatResponseDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  messageId: string;

  @IsEnum(Intent)
  intent: Intent;

  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  actions?: Array<{
    type: string; // 'generate', 'approve', 'view_tickets', etc.
    label: string;
    url?: string;
    data?: any;
  }>;

  @IsOptional()
  @IsArray()
  suggestions?: string[]; // Follow-up suggestions

  @IsOptional()
  data?: any; // Contextual data (test cases, tickets, etc.)

  tokensUsed?: number;
  costEur?: number;
  timestamp: Date;
}

/**
 * Chat session creation DTO
 */
export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  context?: string; // Initial context (ticket key, project, etc.)

  @IsOptional()
  @IsString()
  title?: string; // Session title
}

/**
 * Chat history request DTO
 */
export class ChatHistoryQueryDto {
  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;

  @IsOptional()
  @IsEnum(Intent)
  intentFilter?: Intent;
}

/**
 * WebSocket chat message format
 */
export class WebSocketChatDto {
  type: 'message_sent' | 'message_received' | 'typing' | 'session_updated';
  sessionId: string;
  message?: ChatResponseDto;
  userId?: string;
  timestamp: Date;
}
