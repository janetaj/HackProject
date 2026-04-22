/**
 * Base Export Adapter
 * Abstract class for export format implementations
 */

export interface TestCaseExportRecord {
  id: string;
  testCaseId: string;
  title: string;
  description: string;
  type: string;
  status: string;
  projectKey: string;
  jiraKey: string;
  module: string;
  createdBy: string;
  createdAt: Date;
  approvedBy?: string;
  approvalComment?: string;
  tokensUsed: number;
  costEur: number;
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
    data?: string;
    precondition?: string;
  }>;
}

export abstract class BaseExportAdapter {
  /**
   * Convert test cases to export format
   * Returns buffer or file path
   */
  abstract generate(
    testCases: TestCaseExportRecord[],
    fileName: string,
  ): Promise<Buffer | string>;

  /**
   * Get file MIME type
   */
  abstract getMimeType(): string;

  /**
   * Get file extension
   */
  abstract getFileExtension(): string;

  /**
   * Format a single test case for export
   */
  protected formatTestCase(testCase: TestCaseExportRecord): any {
    return {
      id: testCase.id,
      testCaseId: testCase.testCaseId,
      title: testCase.title,
      description: testCase.description,
      type: testCase.type,
      status: testCase.status,
      projectKey: testCase.projectKey,
      jiraKey: testCase.jiraKey,
      module: testCase.module,
      createdBy: testCase.createdBy,
      createdAt: testCase.createdAt,
      approvedBy: testCase.approvedBy || 'N/A',
      approvalComment: testCase.approvalComment || 'N/A',
      tokensUsed: testCase.tokensUsed,
      costEur: testCase.costEur.toFixed(4),
      stepCount: testCase.steps.length,
    };
  }

  /**
   * Format test steps for export
   */
  protected formatSteps(steps: any[]): Array<any> {
    return steps.map((step) => ({
      step: step.stepNumber,
      action: step.action,
      expectedResult: step.expectedResult,
      data: step.data || 'N/A',
      precondition: step.precondition || 'N/A',
    }));
  }

  /**
   * Get export summary
   */
  protected getSummary(testCases: TestCaseExportRecord[]): any {
    const summary = {
      totalCases: testCases.length,
      totalSteps: testCases.reduce((sum, tc) => sum + tc.steps.length, 0),
      totalTokens: testCases.reduce((sum, tc) => sum + tc.tokensUsed, 0),
      totalCost: testCases.reduce((sum, tc) => sum + tc.costEur, 0).toFixed(4),
      byType: this.countByType(testCases),
      byStatus: this.countByStatus(testCases),
      byProject: this.countByProject(testCases),
    };
    return summary;
  }

  private countByType(testCases: TestCaseExportRecord[]): any {
    const counts = {};
    testCases.forEach((tc) => {
      counts[tc.type] = (counts[tc.type] || 0) + 1;
    });
    return counts;
  }

  private countByStatus(testCases: TestCaseExportRecord[]): any {
    const counts = {};
    testCases.forEach((tc) => {
      counts[tc.status] = (counts[tc.status] || 0) + 1;
    });
    return counts;
  }

  private countByProject(testCases: TestCaseExportRecord[]): any {
    const counts = {};
    testCases.forEach((tc) => {
      counts[tc.projectKey] = (counts[tc.projectKey] || 0) + 1;
    });
    return counts;
  }
}
