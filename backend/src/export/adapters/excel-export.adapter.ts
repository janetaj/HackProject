/**
 * Excel Export Adapter
 * Implementation for Excel (.xlsx) format export
 */

import { Injectable } from '@nestjs/common';
import { BaseExportAdapter, TestCaseExportRecord } from './base-export.adapter';

import * as XLSX from 'xlsx';

@Injectable()
export class ExcelExportAdapter extends BaseExportAdapter {
  getMimeType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  getFileExtension(): string {
    return 'xlsx';
  }

  async generate(
    testCases: TestCaseExportRecord[],
    fileName: string,
  ): Promise<Buffer> {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Test Cases
    const testCaseData = testCases.map((tc) => ({
      'Test Case ID': tc.id,
      'Title': tc.title,
      'Description': tc.description,
      'Type': tc.type,
      'Status': tc.status,
      'Project': tc.projectKey,
      'Jira Key': tc.jiraKey,
      'Module': tc.module,
      'Step Count': tc.steps.length,
      'Steps Detail': tc.steps
        .map((s) => `${s.stepNumber}. ${s.action} -> ${s.expectedResult}`)
        .join('\n'),
      'Created By': tc.createdBy,
      'Created Date': tc.createdAt,
      'Approved By': tc.approvedBy || 'N/A',
      'Approval Comment': tc.approvalComment || 'N/A',
      'Tokens Used': tc.tokensUsed,
      'Cost (EUR)': tc.costEur.toFixed(4),
    }));

    const ws1 = XLSX.utils.json_to_sheet(testCaseData);
    ws1['!cols'] = [
      { wch: 15 }, // Test Case ID
      { wch: 30 }, // Title
      { wch: 50 }, // Description
      { wch: 12 }, // Type
      { wch: 15 }, // Status
      { wch: 10 }, // Project
      { wch: 12 }, // Jira Key
      { wch: 15 }, // Module
      { wch: 10 }, // Step Count
      { wch: 60 }, // Steps Detail
      { wch: 15 }, // Created By
      { wch: 20 }, // Created Date
      { wch: 15 }, // Approved By
      { wch: 30 }, // Approval Comment
      { wch: 12 }, // Tokens
      { wch: 12 }, // Cost
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Test Cases');

    // Sheet 2: Steps Detail
    const stepsData = [];
    testCases.forEach((tc) => {
      tc.steps.forEach((step) => {
        stepsData.push({
          'Test Case ID': tc.id,
          'Test Case Title': tc.title,
          'Step Number': step.stepNumber,
          'Action': step.action,
          'Expected Result': step.expectedResult,
          'Data': step.data || 'N/A',
          'Precondition': step.precondition || 'N/A',
        });
      });
    });

    const ws2 = XLSX.utils.json_to_sheet(stepsData);
    ws2['!cols'] = [
      { wch: 15 }, // Test Case ID
      { wch: 30 }, // Title
      { wch: 10 }, // Step Number
      { wch: 30 }, // Action
      { wch: 40 }, // Expected Result
      { wch: 20 }, // Data
      { wch: 30 }, // Precondition
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Steps');

    // Sheet 3: Summary
    const summary = this.getSummary(testCases);
    const summaryData = [
      { Metric: 'Total Test Cases', Value: summary.totalCases },
      { Metric: 'Total Steps', Value: summary.totalSteps },
      { Metric: 'Total Tokens', Value: summary.totalTokens },
      { Metric: 'Total Cost (EUR)', Value: summary.totalCost },
      { Metric: 'Export Date', Value: new Date().toISOString() },
    ];

    const ws3 = XLSX.utils.json_to_sheet(summaryData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }
}

