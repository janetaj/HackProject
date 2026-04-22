/**
 * Jira Ticket Response DTO
 * Represents a Jira ticket with parsed fields
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type JiraTicketStatus =
  | 'new'
  | 'updated'
  | 'parsing'
  | 'ready_for_generation'
  | 'generation_queued'
  | 'generating'
  | 'completed'
  | 'skipped';

export class JiraTicketResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'PROJ-123' })
  jiraKey: string;

  @ApiProperty({ example: '10001' })
  jiraId: string;

  @ApiProperty({ example: 'Implement login feature' })
  summary: string;

  @ApiProperty({ example: 'As a user I want to login...' })
  description: string;

  @ApiProperty({ example: 'STORY-456' })
  storyId: string;

  @ApiProperty({ example: 'Authentication' })
  module: string;

  @ApiProperty({ type: [String], example: ['User can login with email', 'User sees error on wrong password'] })
  acceptanceCriteria: string[];

  @ApiProperty({ type: [String], example: ['Login', 'Authentication'] })
  headers: string[];

  @ApiProperty({ enum: ['new', 'updated', 'parsing', 'ready_for_generation', 'generation_queued', 'generating', 'completed', 'skipped'], example: 'new' })
  status: JiraTicketStatus;

  @ApiProperty({ example: 'In Progress' })
  jiraStatus: string;

  @ApiProperty({ example: 'PROJ' })
  project: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  fetchedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:35:00Z', nullable: true })
  parsedAt: Date | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}

export class PaginatedJiraTicketResponseDto {
  @ApiProperty({ type: [JiraTicketResponseDto] })
  data: JiraTicketResponseDto[];

  @ApiProperty({
    example: { page: 1, pageSize: 20, total: 100, totalPages: 5 },
  })
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
