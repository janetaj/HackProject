/**
 * Create User DTO
 * Used by admins to create new user accounts
 */

import { IsEmail, IsString, MinLength, MaxLength, IsEnum } from 'class-validator';

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(['admin', 'qa_lead', 'qa_tester', 'viewer'])
  role: UserRole;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;
}
