/**
 * Test Case Response DTO
 * Response format for test cases
 */

import { IsString, IsArray, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum TestCaseStatus {
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export class TestStepResponseDto {
  @IsNumber()
  step_number: number;

  @IsString()
  action: string; // What to do

  @IsString()
  expected_result: string; // What should happen

  @IsOptional()
  @IsString()
  data?: string; // Test data (optional)

  @IsOptional()
  @IsString()
  precondition?: string; // Preconditions (optional)
}

export class TestCaseResponseDto {
  @IsString()
  id: string; // TC-PROJ-123-001

  @IsString()
  ticket_id: string; // Link to Jira ticket

  @IsString()
  jira_key: string; // e.g., PROJ-123

  @IsString()
  title: string; // Test case title

  @IsString()
  description: string; // Full description

  @IsEnum(TestCaseStatus)
  status: TestCaseStatus; // pending_review, approved, etc

  @IsString()
  type: string; // positive, negative, boundary, edge_case

  @IsArray()
  steps: TestStepResponseDto[]; // Ordered test steps

  @IsOptional()
  @IsString()
  preconditions?: string; // Setup required

  @IsOptional()
  @IsString()
  postconditions?: string; // Cleanup required

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // filtering: module, feature, priority

  @IsNumber()
  tokens_used: number; // LLM tokens for this test case

  @IsNumber()
  cost_eur: number; // Cost in euros

  @IsBoolean()
  ai_generated: boolean; // Flag for AI-generated content

  @IsString()
  created_at: string; // ISO timestamp

  @IsOptional()
  @IsString()
  created_by?: string; // User ID who requested generation

  @IsOptional()
  @IsString()
  approved_by?: string; // User who approved (if status=approved)

  @IsOptional()
  @IsString()
  approval_comment?: string; // Approval/rejection reason
}

export class PaginatedTestCaseResponseDto {
  @IsArray()
  data: TestCaseResponseDto[];

  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export class GenerationProgressDto {
  @IsString()
  job_id: string;

  @IsString()
  ticket_id: string;

  @IsString()
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @IsNumber()
  progress_percent: number; // 0-100

  @IsNumber()
  test_cases_generated: number;

  @IsOptional()
  @IsString()
  current_step?: string;

  @IsOptional()
  @IsString()
  error_message?: string;

  @IsString()
  created_at: string;

  @IsOptional()
  @IsString()
  completed_at?: string;

  @IsNumber()
  duration_seconds?: number;

  @IsNumber()
  tokens_used?: number;

  @IsNumber()
  cost_eur?: number;
}
