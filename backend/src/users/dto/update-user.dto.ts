/**
 * Update User DTO
 * Used to update user profile information (admin only)
 */

import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['admin', 'qa_lead', 'qa_tester', 'viewer'])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
