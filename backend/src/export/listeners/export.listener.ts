import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExportService } from '../services/export.service';
import { GeneratorRepository } from '../../generator/repositories/generator.repository';
import { ExportRequestDto } from '../dto/export-request.dto';
import { TestCaseExportRecord } from '../adapters/base-export.adapter';

@Injectable()
export class ExportListener {
  private readonly logger = new Logger(ExportListener.name);

  constructor(
    private exportService: ExportService,
    private generatorRepository: GeneratorRepository,
  ) {}

  @OnEvent('export.triggered')
  async handleExportTriggered(payload: { exportId: string; userId: string; request: ExportRequestDto }) {
    const { exportId, userId, request } = payload;
    console.log(`[ExportListener] Event received: export.triggered for ID: ${exportId}`);
    this.logger.log(`Handling export trigger for ID: ${exportId}, User: ${userId}`);

    try {
      // Fetch test cases based on filters
      const { cases } = await this.generatorRepository.getTestCasesPaginated(1000, 0); 
      console.log(`[ExportListener] Fetched ${cases.length} test cases for export ${exportId}`);

      const formattedCases: TestCaseExportRecord[] = cases.map(tc => ({
        id: tc.id,
        testCaseId: tc.id,
        title: tc.title,
        description: tc.description,
        type: tc.type,
        status: tc.status,
        projectKey: tc.project_key,
        jiraKey: tc.jira_key,
        module: tc.project_key, // Using project_key as fallback for module
        createdBy: tc.created_by,
        createdAt: tc.created_at ? new Date(tc.created_at) : new Date(),
        approvedBy: tc.approved_by,
        approvalComment: tc.approval_comment,
        tokensUsed: Number(tc.tokens_used || 0),
        costEur: Number(tc.cost_eur || 0),
        steps: (tc.steps || []).map(step => ({
          stepNumber: Number(step.step_number || 0),
          action: step.action || '',
          expectedResult: step.expected_result || '',
          data: step.data || '',
          precondition: step.precondition || '',
        })),
      }));

      await this.exportService.processExport(exportId, request, formattedCases, userId);
      this.logger.log(`Export ${exportId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process export ${exportId}: ${error.message}`, error.stack);
    }
  }
}
