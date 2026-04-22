/**
 * Export Controller
 * REST endpoints for test case export operations
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
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { ExportRequestDto } from '../dto/export-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('v1/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  /**
   * POST /api/v1/export
   * Export test cases (CSV, Excel, or PDF)
   */
  @Post()
  @Roles('admin', 'qa_lead', 'qa_tester')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Export test cases (CSV, Excel, or PDF)' })
  @ApiBody({ type: ExportRequestDto })
  @ApiResponse({ status: 202, description: 'Export job triggered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid export request' })
  async triggerExport(
    @Body() request: ExportRequestDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.exportService.triggerExport(request, user.id);
    return { success: true, data: result, message: 'Export job triggered successfully' };
  }

  /**
   * GET /api/v1/export
   * List export history
   */
  @Get()
  @ApiOperation({ summary: 'List export history' })
  @ApiResponse({ status: 200, description: 'Export history for current user' })
  async getUserExports(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: any,
  ) {
    const result = await this.exportService.getUserExports(user.id, limit, offset);
    return {
      success: true,
      data: result.exports,
      pagination: { total: result.total, limit, offset, pages: result.paginated.pages },
    };
  }

  /**
   * GET /api/v1/export/:id
   * Get export job status
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Export job details and status' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async getExport(@Param('id') id: string) {
    const exp = await this.exportService.getExport(id);
    return {
      success: true,
      data: {
        id: exp.id,
        format: exp.format,
        fileName: exp.fileName,
        fileSize: exp.fileSize,
        recordCount: exp.recordCount,
        status: exp.status,
        createdAt: exp.createdAt,
        expiresAt: exp.expiresAt,
        downloadUrl: exp.downloadUrl,
        downloadCount: exp.downloadCount,
        filters: exp.filters,
      },
    };
  }

  /**
   * GET /api/v1/export/:id/download
   * Download exported file
   */
  @Get(':id/download')
  @ApiOperation({ summary: 'Download exported file' })
  @ApiResponse({ status: 200, description: 'File download stream' })
  @ApiResponse({ status: 400, description: 'Export not ready' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async downloadExport(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exp = await this.exportService.getExport(id);

    if (exp.status !== 'completed') {
      throw new BadRequestException(`Export not ready for download. Status: ${exp.status}`);
    }

    const buffer = await this.exportService.downloadExport(id);

    res.setHeader('Content-Type', this.getMimeType(exp.format));
    res.setHeader('Content-Disposition', `attachment; filename="${exp.fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    return new StreamableFile(buffer);
  }

  /**
   * GET /api/v1/export/stats/overview
   */
  @Get('stats/overview')
  @Roles('admin', 'qa_lead')
  @ApiOperation({ summary: 'Get export statistics' })
  @ApiResponse({ status: 200, description: 'Export statistics overview' })
  async getStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.exportService.getStatistics(start, end);
    return { success: true, data: stats };
  }

  private getMimeType(format: string): string {
    const mimeTypes = {
      csv: 'text/csv',
      json: 'application/json',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}
