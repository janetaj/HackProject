/**
 * CSV Export Adapter
 * Implementation for CSV format export
 */

import { Injectable } from '@nestjs/common';
import { BaseExportAdapter, TestCaseExportRecord } from './base-export.adapter';

@Injectable()
export class CsvExportAdapter extends BaseExportAdapter {
  getMimeType(): string {
    return 'text/csv';
  }

  getFileExtension(): string {
    return 'csv';
  }

  async generate(
    testCases: TestCaseExportRecord[],
    fileName: string,
  ): Promise<Buffer> {
    let csv = '';

    // Add headers
    const headers = [
      'Test Case ID',
      'Title',
      'Description',
      'Type',
      'Status',
      'Project',
      'Jira Key',
      'Module',
      'Steps',
      'Created By',
      'Created Date',
      'Approved By',
      'Approval Comment',
      'Tokens Used',
      'Cost (EUR)',
    ];

    csv += this.escapeAndJoin(headers) + '\n';

    // Add test case rows
    for (const testCase of testCases) {
      const row = [
        testCase.id,
        testCase.title,
        testCase.description,
        testCase.type,
        testCase.status,
        testCase.projectKey,
        testCase.jiraKey,
        testCase.module,
        this.formatStepsAsString(testCase.steps),
        testCase.createdBy,
        testCase.createdAt.toISOString(),
        testCase.approvedBy || 'N/A',
        testCase.approvalComment || 'N/A',
        testCase.tokensUsed.toString(),
        testCase.costEur.toFixed(4),
      ];

      csv += this.escapeAndJoin(row) + '\n';
    }

    // Add summary
    const summary = this.getSummary(testCases);
    csv += '\n\nSUMMARY\n';
    csv += `Total Test Cases,${summary.totalCases}\n`;
    csv += `Total Steps,${summary.totalSteps}\n`;
    csv += `Total Tokens,${summary.totalTokens}\n`;
    csv += `Total Cost (EUR),${summary.totalCost}\n`;

    // Add breakdown by type
    csv += '\nBREAKDOWN BY TYPE\n';
    csv += 'Type,Count\n';
    for (const [type, count] of Object.entries(summary.byType)) {
      csv += `${type},${count}\n`;
    }

    // Add breakdown by status
    csv += '\nBREAKDOWN BY STATUS\n';
    csv += 'Status,Count\n';
    for (const [status, count] of Object.entries(summary.byStatus)) {
      csv += `${status},${count}\n`;
    }

    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Escape CSV fields and join with commas
   */
  private escapeAndJoin(fields: string[]): string {
    return fields
      .map((field) => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (
          field.includes(',') ||
          field.includes('"') ||
          field.includes('\n')
        ) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      })
      .join(',');
  }

  /**
   * Format steps as semicolon-separated string
   */
  private formatStepsAsString(steps: any[]): string {
    return steps
      .map(
        (step) =>
          `Step ${step.stepNumber}: ${step.action} → ${step.expectedResult}`,
      )
      .join('; ');
  }
}
