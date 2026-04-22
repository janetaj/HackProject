/**
 * User Response DTO
 * Sent to clients - excludes password hash and encrypted tokens
 */

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  jira_token_validated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class PaginatedUserResponseDto {
  data: UserResponseDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
