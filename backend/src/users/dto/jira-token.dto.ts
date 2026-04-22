/**
 * Jira Token DTO
 * Used to store and validate Jira API tokens
 */

import { IsString, MinLength } from 'class-validator';

export class UpdateJiraTokenDto {
  @IsString()
  @MinLength(10)
  jiraApiToken: string;

  @IsString()
  @MinLength(5)
  jiraEmail: string;
}

export class JiraTokenValidationResponseDto {
  validated: boolean;
  message: string;
  timestamp: Date;
}
