/**
 * Activity Feed DTO
 * Recent activity feed response
 */

export enum ActivityType {
  TICKET_DETECTED = 'ticket_detected',
  GENERATION_QUEUED = 'generation_queued',
  GENERATION_COMPLETE = 'generation_complete',
  GENERATION_FAILED = 'generation_failed',
  TEST_CASE_APPROVED = 'test_case_approved',
  TEST_CASE_REJECTED = 'test_case_rejected',
  TEST_CASE_EXPORTED = 'test_case_exported',
  USER_LOGIN = 'user_login',
  USER_CREATED = 'user_created',
  CONFIG_CHANGED = 'config_changed',
}

export class ActivityItemDto {
  /**
   * Unique activity ID
   */
  id: string;

  /**
   * Type of activity
   */
  type: ActivityType;

  /**
   * Human-readable title
   */
  title: string;

  /**
   * Detailed description
   */
  description: string;

  /**
   * User who performed the action
   */
  performedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  /**
   * Related entity (ticket key, test case ID, etc.)
   */
  relatedEntity?: {
    id: string;
    name: string;
  };

  /**
   * Metadata (counts, status, etc.)
   */
  metadata?: Record<string, any>;

  /**
   * Timestamp of activity
   */
  timestamp: Date;

  /**
   * Severity level (info, warning, error)
   */
  severity: 'info' | 'warning' | 'error' | 'success';

  /**
   * Action URL for quick navigation
   */
  actionUrl?: string;
}

export class ActivityFeedDto {
  /**
   * List of recent activities (paginated)
   */
  items: ActivityItemDto[];

  /**
   * Total count of activities
   */
  total: number;

  /**
   * Current page
   */
  page: number;

  /**
   * Items per page
   */
  limit: number;

  /**
   * Total pages
   */
  totalPages: number;

  /**
   * Has more items to fetch
   */
  hasMore: boolean;

  /**
   * Timestamp of feed generation
   */
  generatedAt: Date;
}
