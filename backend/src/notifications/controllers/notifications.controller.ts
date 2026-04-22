/**
 * Notifications Controller
 * REST endpoints for notification management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * GET /api/v1/notifications
   * List notifications for current user
   */
  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  async getNotifications(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: any,
  ) {
    const result = await this.notificationsService.getUserNotifications(user.id, limit, offset);
    return {
      success: true,
      data: result.notifications,
      pagination: { total: result.total, unread: result.unread, limit, offset, pages: result.pages },
    };
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { success: true, data: { unreadCount: count } };
  }

  /**
   * POST /api/v1/notifications/mark-all-read
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    const count = await this.notificationsService.markAllAsRead(user.id);
    return {
      success: true,
      data: { markedCount: count },
      message: `${count} notifications marked as read`,
    };
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a notification as read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id);
    return { success: true, data: notification, message: 'Notification marked as read' };
  }

  /**
   * GET /api/v1/notifications/unread
   * Get unread notifications
   */
  @Get('unread')
  @ApiOperation({ summary: 'Get all unread notifications' })
  @ApiResponse({ status: 200, description: 'List of unread notifications' })
  async getUnreadNotifications(
    @Query('limit') limit: number = 50,
    @CurrentUser() user: any,
  ) {
    const notifications = await this.notificationsService.getUnreadNotifications(user.id, limit);
    return { success: true, data: notifications, count: notifications.length };
  }

  /**
   * GET /api/v1/notifications/:id
   * Get a specific notification
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('id') id: string) {
    const notification = await this.notificationsService.getNotification(id);
    return { success: true, data: notification };
  }

  /**
   * DELETE /api/v1/notifications/:id/dismiss
   * Dismiss a notification
   */
  @Delete(':id/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dismiss a notification' })
  @ApiResponse({ status: 204, description: 'Notification dismissed' })
  async dismiss(@Param('id') id: string) {
    await this.notificationsService.dismiss(id);
  }

  /**
   * GET /api/v1/notifications/stats/overview
   */
  @Get('stats/overview')
  @Roles('admin', 'qa_lead')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.notificationsService.getStatistics(start, end);
    return { success: true, data: stats };
  }
}
