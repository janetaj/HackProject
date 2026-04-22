/**
 * Parsed Requirement DTO
 * Represents parsed fields extracted from Jira ticket by Parser Service
 */

import { IsString, IsArray, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { z } from 'zod';

export class ParsedRequirementDto {
  @IsUUID()
  ticket_id: string;

  @IsString()
  story_id: string;

  @IsString()
  title: string;

  @IsString()
  module: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  acceptance_criteria: string[];

  @IsArray()
  @IsString({ each: true })
  headers: string[];

  @IsOptional()
  @IsString()
  test_focus?: string;

  @IsOptional()
  @IsString()
  edge_cases?: string;

  @IsOptional()
  @IsString()
  boundary_conditions?: string;

  @IsString()
  parsed_at: string; // ISO timestamp

  @IsString()
  parser_version: string; // Track which parser version produced this

  @IsOptional()
  @IsString()
  raw_ai_response?: string; // Store raw LLM response for debugging
}

/**
 * Zod Schema for validating parsed requirements
 * Ensures parsed data meets minimum quality standards
 */
export const ParsedRequirementSchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID'),
  story_id: z.string().min(1, 'Story ID is required'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  module: z.string().min(1, 'Module is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  acceptance_criteria: z.array(z.string()).min(1, 'At least 1 acceptance criterion required'),
  headers: z.array(z.string()).optional().default([]),
  test_focus: z.string().optional(),
  edge_cases: z.string().optional(),
  boundary_conditions: z.string().optional(),
  parsed_at: z.string().datetime('Invalid timestamp'),
  parser_version: z.string(),
  raw_ai_response: z.string().optional(),
});

export type ParsedRequirement = z.infer<typeof ParsedRequirementSchema>;

/**
 * Response DTO for parse endpoint
 */
export class ParseResponseDto {
  @IsString()
  ticketId: string;

  @IsString()
  status: 'pending' | 'parsing' | 'success' | 'failed';

  @IsOptional()
  parsedData?: ParsedRequirementDto;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsString()
  createdAt: string;

  @IsString()
  completedAt?: string;

  @IsOptional()
  retryCount?: number;

  @IsOptional()
  tokensUsed?: number;

  @IsOptional()
  @IsString()
  cacheHit?: boolean;
}

/**
 * Batch parse request DTO
 */
export class BatchParseRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ticketIds: string[];

  @IsOptional()
  force?: boolean; // Force re-parse even if cached
}

/**
 * Batch parse response DTO
 */
export class BatchParseResponseDto {
  @IsString()
  jobId: string;

  @IsString()
  status: 'queued' | 'processing' | 'complete' | 'failed';

  totalTickets: number;
  processedTickets: number;
  successCount: number;
  failureCount: number;

  @IsOptional()
  results?: ParseResponseDto[];

  @IsString()
  createdAt: string;
}
