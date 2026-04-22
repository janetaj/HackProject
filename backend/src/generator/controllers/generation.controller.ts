/**
 * Generation Controller
 * REST endpoints for test case generation queue management
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
} from '@nestjs/common';
import { GeneratorService } from '../services/generator.service';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { TestCaseType } from '../dto/generation-request.dto';

@ApiTags('generation')
@ApiBearerAuth()
@Controller('v1/generation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GenerationController {
  constructor(private readonly generatorService: GeneratorService) {}

  /**
   * POST /api/v1/generation/queue
   * Queue tickets for test case generation
   */
  @Post('queue')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue tickets for test case generation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string', format: 'uuid' },
        test_case_types: { type: 'array', items: { type: 'string', enum: Object.values(TestCaseType) } },
        focus_area: { type: 'string' },
      },
      required: ['ticket_id'],
    },
  })
  @ApiResponse({ status: 202, description: 'Generation job queued successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async queueGeneration(
    @Body() request: { ticket_id: string; test_case_types?: TestCaseType[]; focus_area?: string },
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
      message: 'Generation queued successfully',
      data: result,
    };
  }


  /**
   * GET /api/v1/generation/queue
   * List generation queue (filterable by status)
   */
  @Get('queue')
  @Roles('admin', 'qa_lead', 'qa_tester')
  @ApiOperation({ summary: 'List generation queue (filterable by status)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: pending, processing, completed, failed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of queued generation jobs' })
  async listQueue(
    @Query('status') status?: string,
    @Query('limit') limitRaw?: any,
    @Query('offset') offsetRaw?: any,
  ) {
    const limit = Number(limitRaw) || 20;
    const offset = Number(offsetRaw) || 0;
    const result = await this.generatorService.listQueue(status, limit, offset);
    return {
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    };
  }

  /**
   * GET /api/v1/generation/queue/:jobId
   * Get job status and progress
   */
  @Get('queue/:jobId')
  @ApiOperation({ summary: 'Get job status and progress' })
  @ApiResponse({ status: 200, description: 'Job status and progress details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const result = await this.generatorService.getJobStatus(jobId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/v1/generation/queue/:jobId/cancel
   * Cancel a queued or in-progress job
   */
  @Post('queue/:jobId/cancel')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a queued or in-progress job' })
  @ApiResponse({ status: 200, description: 'Job cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelJob(@Param('jobId') jobId: string) {
    const success = await this.generatorService.cancelJob(jobId);
    return {
      success,
      message: success ? 'Job cancelled' : 'Failed to cancel job',
    };
  }

  /**
   * POST /api/v1/generation/queue/:jobId/retry
   * Retry a failed job
   */
  @Post('queue/:jobId/retry')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(@Param('jobId') jobId: string) {
    const result = await this.generatorService.retryJob(jobId);
    return {
      success: true,
      message: 'Job retried successfully',
      data: result,
    };
  }

}
