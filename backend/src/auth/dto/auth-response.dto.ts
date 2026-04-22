/**
 * Auth Response DTO
 * Response from login/register/refresh endpoints
 */

import { ApiProperty } from '@nestjs/swagger';

export class UserInfoDto {
  @ApiProperty({ example: 'uuid-string' })
  id: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ enum: ['admin', 'qa_lead', 'qa_tester', 'viewer'], example: 'admin' })
  role: 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

  @ApiProperty({ example: true })
  is_active: boolean;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';
  is_active: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ example: 3600, description: 'Token expiration in seconds' })
  expiresIn: number; // in seconds

  @ApiProperty({ type: UserInfoDto, description: 'Authenticated user info' })
  user: UserInfo;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'JWT refresh token' })
  refreshToken: string;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ example: 3600, description: 'Token expiration in seconds' })
  expiresIn: number; // in seconds
}
