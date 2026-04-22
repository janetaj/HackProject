/**
 * Dashboard Stats DTO
 * Overall statistics response
 */

export class DashboardStatsDto {
  /**
   * Total count of Jira tickets in system
   */
  ticketCount: number;

  /**
   * Total count of generated test cases
   */
  testCaseCount: number;

  /**
   * Test cases pending review/approval
   */
  pendingApprovalCount: number;

  /**
   * Test cases already approved
   */
  approvedCount: number;

  /**
   * Test cases rejected
   */
  rejectedCount: number;

  /**
   * Current budget spent (in EUR)
   */
  budgetSpent: number;

  /**
   * Total budget allocated (in EUR)
   */
  budgetAllocated: number;

  /**
   * Budget remaining (in EUR)
   */
  budgetRemaining: number;

  /**
   * Budget usage percentage (0-100)
   */
  budgetUsagePercent: number;

  /**
   * Total tokens used across all providers
   */
  totalTokensUsed: number;

  /**
   * Active users (logged in last 7 days)
   */
  activeUsersCount: number;

  /**
   * Total registered users
   */
  totalUsersCount: number;

  /**
   * Generated test cases in last 24 hours
   */
  testCasesLast24h: number;

  /**
   * Timestamp of data refresh
   */
  cachedAt: Date;

  /**
   * TTL of cached data in seconds
   */
  cacheExpiresIn: number;
}
