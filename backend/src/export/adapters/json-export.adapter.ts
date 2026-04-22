/**
 * JSON Export Adapter
 * Implementation for JSON format export
 */

import { Injectable } from '@nestjs/common';
import { BaseExportAdapter, TestCaseExportRecord } from './base-export.adapter';

@Injectable()
export class JsonExportAdapter extends BaseExportAdapter {
  getMimeType(): string {
    return 'application/json';
  }

  getFileExtension(): string {
    return 'json';
  }

  async generate(
    testCases: TestCaseExportRecord[],
    fileName: string,
  ): Promise<Buffer> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        fileName,
        format: 'json',
        recordCount: testCases.length,
      },
      summary: this.getSummary(testCases),
      testCases: testCases.map((tc) => this.formatTestCaseDetailed(tc)),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return Buffer.from(jsonString, 'utf-8');
  }

  /**
   * Format test case with full details for JSON
   */
  private formatTestCaseDetailed(testCase: TestCaseExportRecord): any {
    return {
      id: testCase.id,
      testCaseId: testCase.testCaseId,
      title: testCase.title,
      description: testCase.description,
      type: testCase.type,
      status: testCase.status,
      project: {
        key: testCase.projectKey,
        jiraKey: testCase.jiraKey,
        module: testCase.module,
      },
      audit: {
        createdBy: testCase.createdBy,
        createdAt: testCase.createdAt,
        approvedBy: testCase.approvedBy || null,
        approvalComment: testCase.approvalComment || null,
      },
      cost: {
        tokensUsed: testCase.tokensUsed,
        costEur: parseFloat(testCase.costEur.toFixed(4)),
      },
      steps: testCase.steps.map((step) => ({
        number: step.stepNumber,
        action: step.action,
        expectedResult: step.expectedResult,
        data: step.data || null,
        precondition: step.precondition || null,
      })),
    };
  }
}
