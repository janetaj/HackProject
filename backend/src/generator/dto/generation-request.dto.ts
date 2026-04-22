/**
 * Generation Request DTO
 * Request payload for test case generation
 */

import { IsString, IsUUID, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum TestCaseType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  BOUNDARY = 'boundary',
  EDGE_CASE = 'edge_case',
}

export class GenerationRequestDto {
  @IsUUID()
  ticket_id: string; // Jira ticket ID

  @IsOptional()
  @IsString()
  project_key?: string; // Project key for ID generation

  @IsOptional()
  @IsArray()
  @IsEnum(TestCaseType, { each: true })
  test_case_types?: TestCaseType[]; // Which types to generate (default: all)

  @IsOptional()
  @IsString()
  focus_area?: string; // Optional focus area for generation

  @IsOptional()
  regenerate?: boolean; // Force regenerate even if exists
}

export class BatchGenerationRequestDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ticket_ids: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(TestCaseType, { each: true })
  test_case_types?: TestCaseType[];

  @IsOptional()
  regenerate?: boolean;
}

export class GenerationQueueRequest {
  ticket_id: string;
  jira_key: string;
  parsed_data: any;
  user_id: string;
  project_key: string;
  test_case_types: TestCaseType[];
  focus_area?: string;
  attempt: number;
  created_at: Date;
}
