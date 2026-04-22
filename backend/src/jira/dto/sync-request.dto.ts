/**
 * Sync Request DTO
 * Used to trigger manual Jira synchronization
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class SyncRequestDto {
  @ApiPropertyOptional({ example: 'PROJ', description: 'Jira project key to sync (or "all")' })
  @IsOptional()
  @IsString()
  projectKey?: string;

  @ApiPropertyOptional({ example: false, description: 'Force full re-sync' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class SyncResponseDto {
  @ApiProperty({ example: 'Sync triggered successfully' })
  message: string;

  @ApiProperty({ example: 25 })
  ticketsFetched: number;

  @ApiProperty({ example: 10 })
  ticketsNew: number;

  @ApiProperty({ example: 5 })
  ticketsUpdated: number;

  @ApiProperty({ example: 10 })
  ticketsUnchanged: number;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  timestamp: Date;
}
