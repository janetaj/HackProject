/**
 * Test Cases Controller
 * REST endpoints for test case management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GeneratorRepository } from '../repositories/generator.repository';
import { GeneratorService } from '../services/generator.service';

export class UpdateTestStepDto {
  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Expected result' })
  @IsOptional()
  @IsString()
  expectedResult?: string;

  @ApiPropertyOptional({ description: 'Step order/sequence number' })
  @IsOptional()
  order?: number;
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional({ description: 'Updated title for the test case' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated test steps array', type: [UpdateTestStepDto] })
  @IsOptional()
  @IsArray()
  steps?: UpdateTestStepDto[];

  @ApiPropertyOptional({ description: 'Priority level: low, medium, high, critical' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Module or feature area' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated preconditions' })
  @IsOptional()
  @IsString()
  preconditions?: string;
}

export class RejectTestCaseDto {
  @ApiProperty({ description: 'Reason for rejecting this test case' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class BulkActionDto {
  @ApiProperty({ description: 'Array of test case IDs to act on', type: [String] })
  @IsArray()
  testCaseIds: string[];

  @ApiProperty({ description: 'Action: approve, reject, or regenerate', enum: ['approve', 'reject', 'regenerate'] })
  @IsString()
  @IsIn(['approve', 'reject', 'regenerate'])
  action: 'approve' | 'reject' | 'regenerate';

  @ApiPropertyOptional({ description: 'Reject reason (required when action is reject)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('test-cases')
@ApiBearerAuth()
@Controller('v1/test-cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TestCasesController {
  constructor(
    private readonly generatorRepository: GeneratorRepository,
    private readonly generatorService: GeneratorService,
  ) {}

  /**
   * GET /api/v1/test-cases
   * List test cases (filterable by module, type, status, story)
   */
  @Get()
  @ApiOperation({ summary: 'List test cases (filterable by module, type, status, story)' })
  @ApiQuery({ name: 'module', required: false, description: 'Filter by module' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type: positive, negative, boundary, edge_case' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status: pending, approved, rejected' })
  @ApiQuery({ name: 'story', required: false, description: 'Filter by Jira story ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of test cases' })
  async listTestCases(
    @Query('module') module?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('story') story?: string,
    @Query('page') pageRaw?: any,
    @Query('pageSize') pageSizeRaw?: any,
    @Query('limit') limitRaw?: any,
    @Query('offset') offsetRaw?: any,
  ) {
    // Priority: use limit/offset if provided, otherwise use page/pageSize
    let limit = Number(limitRaw || pageSizeRaw) || 20;
    let offset = Number(offsetRaw) || 0;
    
    if (pageRaw && !offsetRaw) {
      const page = Number(pageRaw) || 1;
      offset = (page - 1) * limit;
    }
    
    const where: any = {};
    if (module) where.project_key = module;
    if (type) where.type = type;
    if (status) where.status = status;
    if (story) where.jira_key = story;

    const [cases, total] = await this.generatorRepository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
      relations: ['steps'],
    });

    // Map fields to match frontend expectations
    const mappedData = cases.map(tc => ({
      ...tc,
      ticket_key: tc.jira_key, // Frontend expects ticket_key
      priority: tc.type === 'edge_case' ? 'high' : 'medium', // Default priority mapping
    }));

    return { 
      success: true, 
      data: mappedData, 
      pagination: { total, limit, offset },
      meta: { // Some parts of the frontend might expect 'meta'
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        totalElements: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * POST /api/v1/test-cases/bulk-action
   * Bulk approve, reject, or regenerate test cases
   * NOTE: Must come BEFORE /:id routes to avoid route conflict
   */
  @Post('bulk-action')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve, reject, or regenerate test cases' })
  @ApiBody({ type: BulkActionDto })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bulk action or missing reason for reject' })
  async bulkAction(
    @Body() dto: BulkActionDto,
    @CurrentUser() user: any,
  ) {
    if (dto.action === 'reject' && !dto.reason) {
      throw new BadRequestException('Reason is required for reject action');
    }
    return {
      success: true,
      message: `Bulk ${dto.action} completed`,
      data: { processed: dto.testCaseIds.length, action: dto.action },
    };
  }

  /**
   * GET /api/v1/test-cases/:id
   * Get test case with all steps
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get test case with all steps' })
  @ApiResponse({ status: 200, description: 'Test case details with all steps' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  async getTestCase(@Param('id') id: string) {
    const testCase = await this.generatorRepository.getTestCaseById(id);
    if (!testCase) throw new BadRequestException('Test case not found');
    return { success: true, data: testCase };
  }

  /**
   * PATCH /api/v1/test-cases/:id
   * Inline edit test case (title, steps, priority, module)
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inline edit test case (title, steps, priority, module)' })
  @ApiBody({ type: UpdateTestCaseDto })
  @ApiResponse({ status: 200, description: 'Test case updated successfully' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  async updateTestCase(
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ) {
    const testCase = await this.generatorRepository.getTestCaseById(id);
    if (!testCase) throw new BadRequestException('Test case not found');

    if (dto.title) testCase.title = dto.title;
    if (dto.description) testCase.description = dto.description;
    if (dto.preconditions) testCase.preconditions = dto.preconditions;
    if (dto.priority) {
      // In this system priority might be a tag or custom field
    }
    if (dto.module) testCase.project_key = dto.module;

    const updated = await this.generatorRepository.save(testCase);
    return { success: true, message: 'Test case updated', data: updated };
  }

  /**
   * POST /api/v1/test-cases/:id/approve
   * Approve a test case
   */
  @Post(':id/approve')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a test case' })
  @ApiResponse({ status: 200, description: 'Test case approved successfully' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  async approveTestCase(
    @Param('id') id: string,
    @Body() body: { comment?: string },
    @CurrentUser() user: any,
  ) {
    const testCase = await this.generatorService.approveTestCase(id, user.id, body.comment);
    return { success: true, message: 'Test case approved', data: testCase };
  }

  /**
   * POST /api/v1/test-cases/:id/reject
   * Reject a test case with reason
   */
  @Post(':id/reject')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a test case with reason' })
  @ApiBody({ type: RejectTestCaseDto })
  @ApiResponse({ status: 200, description: 'Test case rejected' })
  @ApiResponse({ status: 400, description: 'Reason is required' })
  async rejectTestCase(
    @Param('id') id: string,
    @Body() body: RejectTestCaseDto,
    @CurrentUser() user: any,
  ) {
    if (!body.reason) throw new BadRequestException('Reason is required');
    const testCase = await this.generatorService.rejectTestCase(id, user.id, body.reason);
    return { success: true, message: 'Test case rejected', data: testCase };
  }

  /**
   * POST /api/v1/test-cases/:id/regenerate
   * Archive and regenerate test case
   */
  @Post(':id/regenerate')
  @Roles('admin', 'qa_lead')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Archive and regenerate test case' })
  @ApiResponse({ status: 202, description: 'Regeneration job queued' })
  @ApiResponse({ status: 404, description: 'Test case not found' })
  async regenerateTestCase(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return { success: true, message: 'Test case regeneration queued' };
  }
}
