/**
 * Export Service
 * Orchestrates export operations with multiple format support
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ExportRequestDto, ExportFormat, ExportResult } from '../dto/export-request.dto';
import { ExportHistory } from '../entities/export-history.entity';
import { ExportRepository } from '../repositories/export.repository';
import { CsvExportAdapter } from '../adapters/csv-export.adapter';
import { JsonExportAdapter } from '../adapters/json-export.adapter';
import { ExcelExportAdapter } from '../adapters/excel-export.adapter';
import { BaseExportAdapter, TestCaseExportRecord } from '../adapters/base-export.adapter';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly exportDir = path.join(process.cwd(), 'exports');

  // Map export formats to adapters
  private adapters = {
    [ExportFormat.CSV]: new CsvExportAdapter(),
    [ExportFormat.JSON]: new JsonExportAdapter(),
    [ExportFormat.EXCEL]: new ExcelExportAdapter(),
  };

  constructor(
    private exportRepository: ExportRepository,
    @InjectRepository(ExportHistory)
    private historyRepository: Repository<ExportHistory>,
    private eventEmitter: EventEmitter2,
  ) {
    this.ensureExportDirectory();
  }

  /**
   * Trigger export job
   */
  async triggerExport(
    request: ExportRequestDto,
    userId: string,
  ): Promise<{ exportId: string; status: string }> {
    try {
      // Create pending export record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const exportHistory = this.historyRepository.create({
        userId,
        format: request.format,
        fileName: `export_${Date.now()}.${this.getFileExtension(request.format)}`,
        filePath: '', // Will be set after generation
        fileSize: 0,
        recordCount: 0,
        duration: 0,
        filters: request,
        status: 'pending',
        expiresAt,
      });

      const saved = await this.historyRepository.save(exportHistory);

      // Emit async export event (would be handled by worker in production)
      this.eventEmitter.emit('export.triggered', {
        exportId: saved.id,
        userId,
        request,
      });

      return {
        exportId: saved.id,
        status: 'pending',
      };
    } catch (error) {
      this.logger.error('Export trigger failed:', error);
      throw new BadRequestException('Failed to trigger export');
    }
  }

  /**
   * Process export (called by worker or directly)
   */
  async processExport(
    exportId: string,
    request: ExportRequestDto,
    testCases: TestCaseExportRecord[],
    userId: string,
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Update status to in_progress
      await this.exportRepository.updateStatus(exportId, 'in_progress');

      // Select adapter based on format
      const adapter = this.getAdapter(request.format);
      if (!adapter) {
        throw new BadRequestException(`Unsupported format: ${request.format}`);
      }

      // Generate file
      const fileName = `export_${exportId}.${adapter.getFileExtension()}`;
      const filePath = path.join(this.exportDir, fileName);

      const buffer = await adapter.generate(testCases, fileName);
      await fs.writeFile(filePath, buffer);

      // Get file stats
      const stats = await fs.stat(filePath);
      const duration = Date.now() - startTime;

      // Fetch existing record
      const exportHistory = await this.historyRepository.findOne({ where: { id: exportId } });
      if (!exportHistory) {
        throw new BadRequestException(`Export record ${exportId} not found`);
      }

      // Update export history
      exportHistory.fileName = fileName;
      exportHistory.filePath = filePath;
      exportHistory.fileSize = stats.size;
      exportHistory.recordCount = testCases.length;
      exportHistory.duration = duration;
      exportHistory.status = 'completed' as any;
      
      // Generate download URL
      const downloadUrl = `/api/v1/export/${exportId}/download`;
      exportHistory.downloadUrl = downloadUrl;

      await this.historyRepository.save(exportHistory);


      this.logger.log(`Export completed: ${exportId} - ${testCases.length} records`);

      // Emit completion event
      this.eventEmitter.emit('export.completed', {
        exportId,
        userId,
        format: request.format,
        recordCount: testCases.length,
      });

      return {
        exportId,
        format: request.format,
        filePath,
        fileName,
        fileSize: stats.size,
        recordCount: testCases.length,
        duration,
        createdAt: exportHistory.createdAt,
        expiresAt: exportHistory.expiresAt,
      };
    } catch (error) {
      this.logger.error(`Export processing failed for ${exportId}:`, error);
      await this.exportRepository.updateStatus(
        exportId,
        'failed',
        error.message,
      );

      this.eventEmitter.emit('export.failed', {
        exportId,
        userId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string): Promise<ExportHistory> {
    const exp = await this.exportRepository.getExportById(exportId);
    if (!exp) {
      throw new BadRequestException('Export not found');
    }
    return exp;
  }

  /**
   * Get user's export history
   */
  async getUserExports(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number; paginated: { limit: number; offset: number; pages: number } }> {
    const { exports, total } = await this.exportRepository.getUserExports(
      userId,
      limit,
      offset,
    );

    return {
      exports,
      total,
      paginated: {
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Download export file
   */
  async downloadExport(exportId: string): Promise<Buffer> {
    const exportHistory = await this.getExport(exportId);

    // Check if file exists
    try {
      const buffer = await fs.readFile(exportHistory.filePath);

      // Record download
      await this.exportRepository.recordDownload(exportId);

      return buffer;
    } catch (error) {
      this.logger.error(`Failed to read export file: ${exportHistory.filePath}`, error);
      throw new BadRequestException('Export file not found or expired');
    }
  }

  /**
   * Get export statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    return this.exportRepository.getExportStatistics(startDate, endDate);
  }

  /**
   * Search exports
   */
  async searchExports(
    filters: any,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number }> {
    return this.exportRepository.searchExports(filters, limit, offset);
  }

  /**
   * Cleanup expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const count = await this.exportRepository.deleteExpiredExports();
    this.logger.log(`Cleaned up ${count} expired exports`);
    return count;
  }

  /**
   * Get most popular export formats
   */
  async getPopularFormats(): Promise<any> {
    return this.exportRepository.getPopularFormats();
  }

  /**
   * Get top exporters
   */
  async getTopExporters(limit: number = 10): Promise<any> {
    return this.exportRepository.getTopExporters(limit);
  }

  /**
   * Get adapter for format
   */
  private getAdapter(format: string): BaseExportAdapter | null {
    return this.adapters[format] || null;
  }

  /**
   * Get file extension for format
   */
  private getFileExtension(format: string): string {
    const adapter = this.getAdapter(format);
    return adapter ? adapter.getFileExtension() : 'dat';
  }

  /**
   * Ensure export directory exists
   */
  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create export directory:', error);
    }
  }
}
