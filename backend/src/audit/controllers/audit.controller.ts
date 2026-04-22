/**
 * Audit Controller
 * REST endpoints for audit log access and compliance reporting
 */

import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../services/audit.service';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { User } from '../../users/entities/user.entity';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private auditService: AuditService) {}

  /**
   * Get my audit logs
   */
  @Get('my-logs')
  async getMyLogs(
    @CurrentUser() user: User,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    const { logs, total } = await this.auditService.getUserLogs(
      user.id,
      Math.min(limit, 100),
      offset,
    );
    return {
      logs: logs.map(this.mapToDto),
      total,
    };
  }

  /**
   * Search audit logs (Admin only)
   */
  @Get('search')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async search(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: 'success' | 'failure',
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    const filters = {
      userId,
      action,
      entity,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    };

    const { logs, total } = await this.auditService.search(
      filters,
      Math.min(limit, 100),
      offset,
    );

    return {
      logs: logs.map(this.mapToDto),
      total,
    };
  }

  /**
   * Get audit statistics
   */
  @Get('statistics')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getStatistics() {
    return this.auditService.getStatistics();
  }

  /**
   * Get compliance report
   */
  @Get('compliance-report')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getComplianceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actions') actions?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required (ISO 8601 format)',
      );
    }

    const actionTypes = actions ? actions.split(',') : undefined;

    return this.auditService.generateComplianceReport(
      new Date(startDate),
      new Date(endDate),
      actionTypes,
    );
  }

  /**
   * Detect suspicious activities
   */
  @Get('suspicious-activities')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async detectSuspiciousActivities(
    @Query('windowMinutes') windowMinutes: number = 5,
  ) {
    return this.auditService.detectSuspiciousActivities(windowMinutes);
  }

  /**
   * Get user activity summary
   */
  @Get('user-activity')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getUserActivitySummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required (ISO 8601 format)',
      );
    }

    return this.auditService.getUserActivitySummary(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Cleanup old logs (Admin only)
   * Deletes logs older than specified retention days
   */
  @Post('cleanup')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async cleanupOldLogs(
    @Query('retentionDays') retentionDays: number = 7,
  ): Promise<{ deletedCount: number; message: string }> {
    if (retentionDays < 1 || retentionDays > 365) {
      throw new BadRequestException(
        'retentionDays must be between 1 and 365',
      );
    }

    const deleted = await this.auditService.cleanupOldLogs(retentionDays);

    this.logger.log(
      `Audit logs cleanup completed: ${deleted} records deleted`,
    );

    return {
      deletedCount: deleted,
      message: `Successfully deleted ${deleted} audit logs older than ${retentionDays} days`,
    };
  }

  /**
   * Health check for audit module
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      module: 'audit',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Map audit log entity to DTO
   */
  private mapToDto(log: any): AuditLogResponseDto {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      beforeSnapshot: log.beforeSnapshot,
      afterSnapshot: log.afterSnapshot,
      metadata: log.metadata,
      status: log.status,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
    };
  }
}
