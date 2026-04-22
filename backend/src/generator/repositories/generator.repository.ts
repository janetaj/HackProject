/**
 * Generator Repository
 * Database operations for test cases
 */

import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TestCase } from '../entities/test-case.entity';
import { TestStep } from '../entities/test-step.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GeneratorRepository extends Repository<TestCase> {
  constructor(private dataSource: DataSource) {
    super(TestCase, dataSource.createEntityManager());
  }

  /**
   * Create a test case with steps
   */
  async createTestCase(data: {
    test_case_id: string;
    ticket_id: string;
    jira_key: string;
    project_key: string;
    title: string;
    description: string;
    type: string;
    preconditions?: string;
    postconditions?: string;
    steps: Array<{
      step_number: number;
      action: string;
      expected_result: string;
      data?: string;
      precondition?: string;
    }>;
    created_by: string;
    tokens_used: number;
    cost_eur: number;
    tags?: string[];
    raw_ai_response?: any;
  }): Promise<TestCase> {
    const testCase = new TestCase();
    testCase.id = data.test_case_id;
    testCase.ticket_id = data.ticket_id;
    testCase.jira_key = data.jira_key;
    testCase.project_key = data.project_key;
    testCase.title = data.title;
    testCase.description = data.description;
    testCase.type = data.type;
    testCase.preconditions = data.preconditions || null;
    testCase.postconditions = data.postconditions || null;
    testCase.created_by = data.created_by;
    testCase.tokens_used = data.tokens_used;
    testCase.cost_eur = data.cost_eur;
    testCase.tags = data.tags || null;
    testCase.raw_ai_response = data.raw_ai_response;
    testCase.status = 'pending_review';

    // Create steps
    const steps = data.steps.map((step) => {
      const testStep = new TestStep();
      testStep.id = uuidv4();
      testStep.test_case_id = testCase.id;
      testStep.step_number = step.step_number;
      testStep.action = step.action;
      testStep.expected_result = step.expected_result;
      testStep.data = step.data || null;
      testStep.precondition = step.precondition || null;
      return testStep;
    });

    testCase.steps = steps;

    // Save test case and steps
    return this.save(testCase);
  }

  /**
   * Get test case by ID
   */
  async getTestCaseById(id: string): Promise<TestCase | null> {
    return this.findOne({
      where: { id },
      relations: ['steps'],
    });
  }

  /**
   * Get all test cases with pagination
   */
  async getTestCasesPaginated(
    limit: number = 50,
    offset: number = 0,
    status?: string,
  ): Promise<{ cases: TestCase[]; total: number }> {
    const where: any = {};
    if (status) where.status = status;

    const [cases, total] = await this.findAndCount({
      where,
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Get all test cases for a ticket
   */

  /**
   * Get all test cases for a ticket
   */
  async getTestCasesByTicket(
    ticketId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: TestCase[]; total: number }> {
    const [cases, total] = await this.findAndCount({
      where: { ticket_id: ticketId },
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Get test cases by status
   */
  async getTestCasesByStatus(
    status: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: TestCase[]; total: number }> {
    const [cases, total] = await this.findAndCount({
      where: { status: status as any },
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Get test cases by type
   */
  async getTestCasesByType(type: string, limit: number = 50, offset: number = 0): Promise<{
    cases: TestCase[];
    total: number;
  }> {
    const [cases, total] = await this.findAndCount({
      where: { type },
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Get test cases for a project
   */
  async getTestCasesByProject(
    projectKey: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: TestCase[]; total: number }> {
    const [cases, total] = await this.findAndCount({
      where: { project_key: projectKey },
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Update test case status
   */
  async updateStatus(
    testCaseId: string,
    status: string,
    approvedBy?: string,
    comment?: string,
  ): Promise<TestCase | null> {
    const data: any = { status };
    if (approvedBy) {
      data.approved_by = approvedBy;
      data.approved_at = new Date();
    }
    if (comment) {
      data.approval_comment = comment;
    }

    await this.update({ id: testCaseId }, data);
    return this.getTestCaseById(testCaseId);
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalCases: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    totalTokensUsed: number;
    totalCostEur: number;
  }> {
    const types = ['positive', 'negative', 'boundary', 'edge_case'];
    const statuses = ['pending_review', 'approved', 'rejected', 'archived'];

    // TODO: Query database with date range
    // SELECT COUNT(*) FROM test_cases WHERE created_at BETWEEN ? AND ?
    // GROUP BY status, type

    return {
      totalCases: 0,
      byStatus: {
        pending_review: 0,
        approved: 0,
        rejected: 0,
        archived: 0,
      },
      byType: {
        positive: 0,
        negative: 0,
        boundary: 0,
        edge_case: 0,
      },
      totalTokensUsed: 0,
      totalCostEur: 0,
    };
  }

  /**
   * Find duplicate test cases (same ticket, same type)
   */
  async findDuplicates(ticketId: string, type: string): Promise<TestCase[]> {
    return this.find({
      where: { ticket_id: ticketId, type },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Delete test case and its steps
   */
  async deleteTestCase(testCaseId: string): Promise<void> {
    await this.delete({ id: testCaseId });
    // Steps cascade deleted via entity relationship
  }

  /**
   * Find pending review test cases
   */
  async getPendingReview(limit: number = 100): Promise<TestCase[]> {
    return this.find({
      where: { status: 'pending_review' },
      relations: ['steps'],
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  /**
   * Bulk update status (for batch approval/rejection)
   */
  async bulkUpdateStatus(testCaseIds: string[], status: string): Promise<number> {
    if (testCaseIds.length === 0) return 0;

    const result = await this.update(
      testCaseIds.map((id) => ({ id })),
      { status: status as any },
    );
    return result.affected || 0;
  }

  /**
   * Get test cases created by user
   */
  async getTestCasesByUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: TestCase[]; total: number }> {
    const [cases, total] = await this.findAndCount({
      where: { created_by: userId },
      relations: ['steps'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });
    return { cases, total };
  }

  /**
   * Search test cases by title
   */
  async search(
    query: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: TestCase[]; total: number }> {
    // TODO: Use ILIKE or FULL TEXT SEARCH
    // WHERE title ILIKE ? OR description ILIKE ?

    return { cases: [], total: 0 };
  }
}
