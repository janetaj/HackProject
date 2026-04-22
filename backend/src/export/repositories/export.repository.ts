/**
 * Export Repository
 * Custom queries for export history and test case retrieval
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ExportHistory } from '../entities/export-history.entity';
import { ExportFilterOptions } from '../dto/export-request.dto';

@Injectable()
export class ExportRepository {
  constructor(
    @InjectRepository(ExportHistory)
    private repository: Repository<ExportHistory>,
  ) {}

  /**
   * Create export history record
   */
  async createExportHistory(
    userId: string,
    format: string,
    fileName: string,
    filePath: string,
    fileSize: number,
    recordCount: number,
    duration: number,
    filters: any,
  ): Promise<ExportHistory> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    const exportHistory = this.repository.create({
      userId: userId as any,
      format: format as any,
      fileName,
      filePath,
      fileSize,
      recordCount,
      duration,
      filters,
      status: 'completed' as any,
      expiresAt,
    });

    return this.repository.save(exportHistory);
  }

  /**
   * Get export by ID
   */
  async getExportById(id: string): Promise<ExportHistory> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * Get export history for user (paginated)
   */
  async getUserExports(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number }> {
    const [exports, total] = await this.repository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { exports, total };
  }

  /**
   * Get exports by status
   */
  async getExportsByStatus(
    status: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number }> {
    const [exports, total] = await this.repository.findAndCount({
      where: { status: status as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { exports, total };
  }

  /**
   * Get exports by format
   */
  async getExportsByFormat(
    format: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number }> {
    const [exports, total] = await this.repository.findAndCount({
      where: { format: format as any },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { exports, total };
  }

  /**
   * Update export status
   */
  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    const update: any = { status };
    if (errorMessage) {
      update.errorMessage = errorMessage;
    }

    await this.repository.update({ id }, update);
  }

  /**
   * Set download URL (signed URL or relative path)
   */
  async setDownloadUrl(id: string, downloadUrl: string): Promise<void> {
    await this.repository.update({ id }, { downloadUrl });
  }

  /**
   * Record download
   */
  async recordDownload(id: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        downloadedAt: new Date(),
        downloadCount: () => 'downloadCount + 1',
      },
    );
  }

  /**
   * Delete expired exports (older than 30 days)
   */
  async deleteExpiredExports(): Promise<number> {
    const now = new Date();
    const result = await this.repository.delete({
      expiresAt: Between(new Date(0), now),
    });

    return result.affected || 0;
  }

  /**
   * Get export statistics (admin only)
   */
  async getExportStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.repository.createQueryBuilder('eh');

    if (startDate && endDate) {
      query.where('eh.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const stats = await query
      .select('eh.format', 'format')
      .addSelect('COUNT(eh.id)', 'count')
      .addSelect('SUM(eh.fileSize)', 'totalSize')
      .addSelect('SUM(eh.recordCount)', 'totalRecords')
      .addSelect('AVG(eh.duration)', 'avgDuration')
      .groupBy('eh.format')
      .getRawMany();

    return stats;
  }

  /**
   * Search exports with filters
   */
  async searchExports(
    filters: any,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ exports: ExportHistory[]; total: number }> {
    const query = this.repository.createQueryBuilder('eh');

    if (filters.userId) {
      query.andWhere('eh.userId = :userId', { userId: filters.userId });
    }

    if (filters.format) {
      query.andWhere('eh.format = :format', { format: filters.format });
    }

    if (filters.status) {
      query.andWhere('eh.status = :status', { status: filters.status });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('eh.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const [exports, total] = await query
      .orderBy('eh.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { exports, total };
  }

  /**
   * Clean up old failed exports (older than 7 days)
   */
  async cleanupFailedExports(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository.delete({
      status: 'failed',
      createdAt: Between(new Date(0), cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Get most common export formats
   */
  async getPopularFormats(): Promise<any> {
    return this.repository
      .createQueryBuilder('eh')
      .select('eh.format', 'format')
      .addSelect('COUNT(eh.id)', 'count')
      . groupBy('eh.format')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  /**
   * Get top contributors by exports
   */
  async getTopExporters(limit: number = 10): Promise<any> {
    return this.repository
      .createQueryBuilder('eh')
      .select('eh.userId', 'userId')
      .addSelect('COUNT(eh.id)', 'exportCount')
      .addSelect('SUM(eh.recordCount)', 'totalRecords')
      .groupBy('eh.userId')
      .orderBy('exportCount', 'DESC')
      .limit(limit)
      .getRawMany();
  }
}
