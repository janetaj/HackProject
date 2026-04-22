/**
 * Add Project DTO
 * Used to add a Jira project to monitoring
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AddProjectDto {
  @ApiProperty({ example: 'PROJ', description: 'Jira project key' })
  @IsString()
  @IsNotEmpty()
  projectKey: string;

  @ApiPropertyOptional({ example: 'My Project', description: 'Display name for the project' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable automatic polling for this project' })
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;
}

export class SyncJiraDto {
  @ApiPropertyOptional({ example: 'PROJ', description: 'Jira project key to sync (or omit for all)' })
  @IsOptional()
  @IsString()
  projectKey?: string;

  @ApiPropertyOptional({ example: false, description: 'Force full re-sync, ignoring cache' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
