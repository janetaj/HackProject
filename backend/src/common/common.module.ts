/**
 * Common Module
 * Exports shared utilities: guards, decorators, filters, interceptors, interfaces
 * Imported by all feature modules
 */

import { Module } from '@nestjs/common';

// Re-export decorators
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { CurrentUser } from './decorators/current-user.decorator';

// Re-export guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Re-export interceptors
export { LoggingInterceptor } from './interceptors/logging.interceptor';
export { TracingInterceptor } from './interceptors/tracing.interceptor';

// Re-export filters
export { GlobalExceptionFilter } from './filters/global-exception.filter';

// Re-export interfaces
export {
  ILLMProvider,
  LLMOptions,
  LLMResponse,
  LLMTokenUsage,
  ModelInfo,
  LLMModelType,
} from './interfaces/llm-provider.interface';

export {
  IExportAdapter,
  ExportFormat,
  ExportFilters,
  ExportResult,
} from './interfaces/export-adapter.interface';

export {
  INotificationChannel,
  NotificationType,
  NotificationPayload,
  NotificationMetadata,
  SendResult,
} from './interfaces/notification-channel.interface';

export {
  IMCPProvider,
  MCPProviderType,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
  MCPCapabilities,
} from './interfaces/mcp-provider.interface';

@Module({
  providers: [],
  exports: [],
})
export class CommonModule {}
