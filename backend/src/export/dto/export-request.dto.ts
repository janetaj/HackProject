/**
 * Export Request DTOs
 * Request payloads for test case export with filtering
 */

import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export enum TestCaseStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum TestCaseType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  BOUNDARY = 'boundary',
  EDGE_CASE = 'edge_case',
}

/**
 * Request DTO for triggering export job
 */
export class ExportRequestDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projects?: string[]; // Project keys to filter by (e.g., ['PROJ', 'QA'])

  @IsOptional()
  @IsArray()
  @IsEnum(TestCaseStatus, { each: true })
  statuses?: TestCaseStatus[]; // Status filter

  @IsOptional()
  @IsArray()
  @IsEnum(TestCaseType, { each: true })
  types?: TestCaseType[]; // Test case type filter

  @IsOptional()
  @IsString()
  module?: string; // Module name filter

  @IsOptional()
  @IsDateString()
  startDate?: string; // ISO 8601 date

  @IsOptional()
  @IsDateString()
  endDate?: string; // ISO 8601 date

  @IsOptional()
  @IsString()
  jiraKey?: string; // Filter by specific Jira ticket

  @IsOptional()
  includeRejected?: boolean; // Include rejected test cases in export

  @IsOptional()
  includeArchived?: boolean; // Include archived test cases in export
}

/**
 * Export filter object (internal use)
 */
export interface ExportFilterOptions {
  projects?: string[];
  statuses?: TestCaseStatus[];
  types?: TestCaseType[];
  module?: string;
  startDate?: Date;
  endDate?: Date;
  jiraKey?: string;
  includeRejected: boolean;
  includeArchived: boolean;
}

/**
 * Export result metadata
 */
export interface ExportResult {
  exportId: string;
  format: ExportFormat;
  filePath: string;
  fileName: string;
  fileSize: number;
  recordCount: number;
  duration: number; // ms
  createdAt: Date;
  expiresAt: Date;
}
