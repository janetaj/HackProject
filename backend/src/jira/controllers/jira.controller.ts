/**
 * Jira Controller
 * REST endpoints for Jira integration
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JiraService } from '../services/jira.service';
import { JiraPollerService } from '../services/jira-poller.service';
import { JiraDedupService } from '../services/jira-dedup.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncRequestDto } from '../dto/sync-request.dto';
import { JiraTicketResponseDto } from '../dto/jira-ticket-response.dto';
import { AddProjectDto, SyncJiraDto } from '../dto/add-project.dto';

@ApiTags('jira')
@ApiBearerAuth()
@Controller('v1/jira')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JiraController {
  constructor(
    private jiraService: JiraService,
    private pollerService: JiraPollerService,
    private dedupService: JiraDedupService,
  ) {}

  /**
   * GET /api/v1/jira/tickets
   * List fetched Jira tickets (paginated, filterable)
   */
  @Get('tickets')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @ApiOperation({ summary: 'List fetched Jira tickets (paginated, filterable)' })
  @ApiQuery({ name: 'projectKey', required: false, description: 'Filter by Jira project key' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by ticket status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results limit (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Results offset (default: 0)' })
  @ApiResponse({ status: 200, description: 'Paginated list of Jira tickets' })
  async getTickets(
    @Query('projectKey') projectKey?: string,
    @Query('status') status?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const numericLimit = Number(limit) || 20;
    const numericOffset = Number(offset) || 0;

    let result;

    if (status) {
      result = await this.jiraService.getTicketsByStatus(status as any, numericLimit, numericOffset);
    } else if (projectKey) {
      result = await this.jiraService.getTicketsByProject(projectKey, numericLimit, numericOffset);
    } else {
      result = await this.jiraService.getAllTickets(numericLimit, numericOffset);
    }

    return {
      success: true,
      data: result.tickets.map((ticket) => this.mapTicketToDto(ticket)),
      pagination: { total: result.total, limit: numericLimit, offset: numericOffset },
    };
  }

  /**
   * GET /api/v1/jira/tickets/:id
   * Get ticket details with parsed fields
   */
  @Get('tickets/:id')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @ApiOperation({ summary: 'Get ticket details with parsed fields' })
  @ApiResponse({ status: 200, description: 'Jira ticket details', type: JiraTicketResponseDto })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicket(@Param('id') id: string) {
    const ticket = await this.jiraService.getTicketById(id);
    if (!ticket) {
      return { success: false, error: 'Ticket not found', statusCode: HttpStatus.NOT_FOUND };
    }
    return { success: true, data: this.mapTicketToDto(ticket) };
  }

  /**
   * POST /api/v1/jira/sync
   * Trigger manual Jira sync
   */
  @Post('sync')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger manual Jira sync' })
  @ApiBody({ type: SyncJiraDto })
  @ApiResponse({ status: 202, description: 'Sync triggered successfully' })
  async syncTickets(
    @Body() syncRequest: SyncRequestDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.jiraService.syncProjectTickets(
      user.id,
      syncRequest.projectKey || 'all',
      syncRequest.force || false,
    );

    return {
      success: true,
      message: 'Sync triggered successfully',
      data: {
        ticketsFetched: result.ticketsFetched,
        ticketsNew: result.ticketsNew,
        ticketsUpdated: result.ticketsUpdated,
        ticketsUnchanged: result.ticketsUnchanged,
        timestamp: new Date(),
      },
    };
  }

  /**
   * GET /api/v1/jira/projects
   * List configured Jira projects
   */
  @Get('projects')
  @Roles('admin', 'qa_lead')
  @ApiOperation({ summary: 'List configured Jira projects' })
  @ApiResponse({ status: 200, description: 'List of configured Jira projects' })
  async getProjects(@CurrentUser() user: any) {
    const projects = await this.jiraService.getAccessibleProjects(user.id);
    return { success: true, data: projects, count: projects.length };
  }

  /**
   * POST /api/v1/jira/projects
   * Add Jira project to monitoring
   */
  @Post('projects')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add Jira project to monitoring' })
  @ApiBody({ type: AddProjectDto })
  @ApiResponse({ status: 201, description: 'Project added to monitoring' })
  @ApiResponse({ status: 409, description: 'Project already being monitored' })
  async addProject(
    @Body() addProjectDto: AddProjectDto,
    @CurrentUser() user: any,
  ) {
    // Sync the new project immediately after adding
    const result = await this.jiraService.syncProjectTickets(
      user.id,
      addProjectDto.projectKey,
      true,
    );
    return {
      success: true,
      message: `Project ${addProjectDto.projectKey} added to monitoring`,
      data: result,
    };
  }

  /**
   * DELETE /api/v1/jira/projects/:id
   * Remove Jira project from monitoring
   */
  @Delete('projects/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove Jira project from monitoring' })
  @ApiResponse({ status: 200, description: 'Project removed from monitoring' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async removeProject(@Param('id') id: string) {
    return {
      success: true,
      message: `Project ${id} removed from monitoring`,
    };
  }

  /**
   * POST /api/v1/jira/validate-token
   * Validate Jira API token
   */
  @Post('validate-token')
  @Roles('admin', 'qa_lead')
  @ApiOperation({ summary: 'Validate Jira API token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(@CurrentUser() user: any) {
    const isValid = await this.jiraService.validateJiraToken(user.id);
    return { success: true, data: { valid: isValid, userId: user.id } };
  }

  /**
   * POST /api/v1/jira/webhooks
   * [Stage 2] Receive Jira webhooks
   */
  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Stage 2] Receive Jira webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  async receiveWebhook(@Body() payload: any) {
    return { success: true, message: 'Webhook received' };
  }

  /**
   * POST /api/v1/jira/poll
   * Trigger manual polling cycle
   */
  @Post('poll')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger manual polling cycle' })
  @ApiResponse({ status: 202, description: 'Polling triggered' })
  async triggerPolling(@Query('projectKey') projectKey?: string) {
    const metrics = await this.pollerService.triggerManual(projectKey);
    return { success: true, message: 'Polling triggered successfully', data: metrics };
  }

  /**
   * GET /api/v1/jira/poller/status
   */
  @Get('poller/status')
  @Roles('admin')
  @ApiOperation({ summary: 'Get poller status and last metrics' })
  @ApiResponse({ status: 200, description: 'Poller status' })
  async getPollerStatus() {
    return {
      success: true,
      data: {
        isPolling: this.pollerService.isRunning(),
        lastMetrics: this.pollerService.getLastMetrics(),
      },
    };
  }

  /**
   * Helper: Map JiraTicket entity to DTO
   */
  private mapTicketToDto(ticket: any): JiraTicketResponseDto {
    return {
      id: ticket.id,
      jiraKey: ticket.jira_key,
      jiraId: ticket.jira_id,
      summary: ticket.summary,
      description: ticket.description,
      storyId: ticket.story_id,
      module: ticket.module,
      acceptanceCriteria: ticket.acceptance_criteria || [],
      headers: ticket.headers || [],
      status: ticket.status,
      jiraStatus: ticket.jira_status,
      project: ticket.project,
      fetchedAt: ticket.fetched_at,
      parsedAt: ticket.parsed_at,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
    };
  }
}
