/**
 * Generator Controller
 * REST endpoints for test case generation
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GeneratorService } from '../services/generator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerationRequestDto, BatchGenerationRequestDto } from '../dto/generation-request.dto';

@ApiTags('Generator')
@ApiBearerAuth()
@Controller('v1/generator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeneratorController {
  constructor(private generatorService: GeneratorService) {}

  /**
   * Queue test case generation
   * POST /api/v1/generator/generate
   * [QA Lead, QA Tester] required
   */
  @Post('generate')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @HttpCode(HttpStatus.ACCEPTED)
  async queueGeneration(
    @Body() request: GenerationRequestDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.generatorService.queueGeneration(
      request.ticket_id,
      user.id,
      request.test_case_types || undefined,
      request.focus_area,
    );

    return {
      success: true,
      data: result,
      message: 'Generation queued successfully',
    };
  }

  /**
   * Queue batch generation
   * POST /api/v1/generator/generate/batch
   * [QA Lead] required
   */
  @Post('generate/batch')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.ACCEPTED)
  async queueBatchGeneration(
    @Body() request: BatchGenerationRequestDto,
    @CurrentUser() user: any,
  ) {
    const jobs = [];

    for (const ticketId of request.ticket_ids) {
      try {
        const job = await this.generatorService.queueGeneration(
          ticketId,
          user.id,
          request.test_case_types,
          undefined,
        );
        jobs.push(job);
      } catch (error) {
        jobs.push({ ticketId, error: error.message });
      }
    }

    return {
      success: true,
      data: {
        jobsQueued: jobs.length,
        jobs,
      },
      message: `${jobs.length} generation jobs queued`,
    };
  }

  /**
   * Get generation job status
   * GET /api/v1/generator/jobs/:jobId
   * [Any authenticated user]
   */
  @Get('jobs/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const status = await this.generatorService.getJobStatus(jobId);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Cancel generation job
   * POST /api/v1/generator/jobs/:jobId/cancel
   * [Admin, QA Lead]
   */
  @Post('jobs/:jobId/cancel')
  @Roles('admin', 'qa_lead')
  async cancelJob(@Param('jobId') jobId: string) {
    const cancelled = await this.generatorService.cancelJob(jobId);

    return {
      success: cancelled,
      message: cancelled ? 'Job cancelled' : 'Failed to cancel job',
    };
  }
  /**
   * Retry failed generation job
   * POST /api/v1/generator/jobs/:jobId/retry
   * [Admin, QA Lead]
   */
  @Post('jobs/:jobId/retry')
  @Roles('admin', 'qa_lead')
  async retryJob(@Param('jobId') jobId: string) {
    const result = await this.generatorService.retryJob(jobId);

    return {
      success: true,
      data: result,
      message: 'Job retried successfully',
    };
  }

  /**
   * Get test cases for a ticket
   * GET /api/v1/generator/tickets/:ticketId/test-cases?limit=50&offset=0
   * [Any authenticated user]
   */
  @Get('tickets/:ticketId/test-cases')
  async getTicketTestCases(
    @Param('ticketId') ticketId: string,
    @Query('limit') limitRaw?: any,
    @Query('offset') offsetRaw?: any,
  ) {
    const limit = Number(limitRaw) || 50;
    const offset = Number(offsetRaw) || 0;
    const result = await this.generatorService.getTicketTestCases(
      ticketId,
      limit,
      offset,
    );

    return {
      success: true,
      data: result.cases,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get test case by ID
   * GET /api/v1/generator/test-cases/:testCaseId
   * [Any authenticated user]
   */
  @Get('test-cases/:testCaseId')
  async getTestCase(@Param('testCaseId') testCaseId: string) {
    // TODO: Implement getTestCaseById in service
    return {
      success: true,
      message: 'Feature not yet implemented',
    };
  }

  /**
   * Approve test case
   * POST /api/v1/generator/test-cases/:testCaseId/approve
   * [QA Lead, Admin]
   */
  @Post('test-cases/:testCaseId/approve')
  @Roles('admin', 'qa_lead')
  async approveTestCase(
    @Param('testCaseId') testCaseId: string,
    @Body() request: { comment?: string },
    @CurrentUser() user: any,
  ) {
    const testCase = await this.generatorService.approveTestCase(
      testCaseId,
      user.id,
      request.comment,
    );

    return {
      success: true,
      data: testCase,
      message: 'Test case approved',
    };
  }

  /**
   * Reject test case
   * POST /api/v1/generator/test-cases/:testCaseId/reject
   * [QA Lead, Admin]
   */
  @Post('test-cases/:testCaseId/reject')
  @Roles('admin', 'qa_lead')
  async rejectTestCase(
    @Param('testCaseId') testCaseId: string,
    @Body() request: { reason: string },
    @CurrentUser() user: any,
  ) {
    if (!request.reason) {
      throw new BadRequestException('Reason is required');
    }

    const testCase = await this.generatorService.rejectTestCase(
      testCaseId,
      user.id,
      request.reason,
    );

    return {
      success: true,
      data: testCase,
      message: 'Test case rejected',
    };
  }

  /**
   * Get generation statistics
   * GET /api/v1/generator/statistics?startDate=2024-01-01&endDate=2024-12-31
   * [Admin, QA Lead]
   */
  @Get('statistics')
  @Roles('admin', 'qa_lead')
  async getStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const stats = await this.generatorService.getStatistics(start, end);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Health check
   * GET /api/v1/generator/health
   * [Any authenticated user]
   */
  @Get('health')
  async health() {
    return {
      success: true,
      status: 'healthy',
      service: 'test-generation',
    };
  }
}
