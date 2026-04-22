/**
 * Generator Service
 * Core business logic for test case generation
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { JiraService } from '../../jira/services/jira.service';
import { LLMService } from '../../llm/services/llm.service';
import { ParserService } from '../../parser/services/parser.service';
import { BudgetManagerService } from '../../llm/services/budget-manager.service';
import { TokenTrackerService } from '../../llm/services/token-tracker.service';
import { GeneratorRepository } from '../repositories/generator.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  generateTestCasePrompt,
  getGenerationSystemPrompt,
  OPENAI_GENERATION_CONFIG,
  generateFallbackTestCases,
  estimateGenerationTokens,
} from '../templates/generator-prompt.template';
import {
  generateTestCaseId,
  generateFallbackTestCase,
  TestCaseDataSchema,
  GenerationBatchOutputSchema,
} from '../dto/test-case-create.dto';
import { TestCaseType } from '../dto/generation-request.dto';
import { TestCase } from '../entities/test-case.entity';
import { v4 as uuidv4 } from 'uuid';
import { LLMOptionsBuilder, LLMProvider } from '../../llm/dto/llm-options.dto';

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);
  private jobMetadata: Map<string, any> = new Map();

  constructor(
    @InjectQueue('test-generation-queue')
    private generationQueue: Queue,
    private jiraService: JiraService,
    private llmService: LLMService,
    private parserService: ParserService,
    private budgetManager: BudgetManagerService,
    private tokenTracker: TokenTrackerService,
    private generatorRepository: GeneratorRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Queue test case generation job
   */
  async queueGeneration(
    ticketId: string,
    userId: string,
    testTypes: TestCaseType[] = Object.values(TestCaseType),
    focusArea?: string,
  ): Promise<{ jobId: string; status: string }> {
    try {
      // Fetch ticket and parsed data
      let ticket = await this.jiraService.getTicketById(ticketId);
      if (!ticket) {
        throw new BadRequestException(`Ticket ${ticketId} not found`);
      }

      // Auto-parse if not parsed yet
      if (!ticket.parsed_fields) {
        this.logger.log(`Ticket ${ticketId} not parsed. Triggering auto-parse before generation.`);
        const parsed = await this.parserService.parseTicket(ticketId);
        if (!parsed) {
          throw new BadRequestException(
            `Failed to parse ticket ${ticketId}. Cannot generate test cases without structured requirements.`,
          );
        }
        // Refresh ticket data with parsed fields
        ticket = await this.jiraService.getTicketById(ticketId);
      }

      // Extract project key from Jira key (e.g., "PROJ-123" -> "PROJ")
      const projectKey = ticket.jira_key.split('-')[0];

      // Create queue job
      const job = await this.generationQueue.add(
        'generate',
        {
          ticket_id: ticketId,
          jira_key: ticket.jira_key,
          parsed_data: ticket.parsed_fields,
          user_id: userId,
          project_key: projectKey,
          test_case_types: testTypes,
          focus_area: focusArea,
          attempt: 0,
          created_at: new Date(),
        },
        {
          attempts: 3, // Retry up to 3 times
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s, double each time
          },
          removeOnComplete: { age: 3600, count: 100 },
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Queued generation job ${job.id} for ticket ${ticketId}`,
      );

      // Store metadata
      this.jobMetadata.set(job.id, {
        ticketId,
        userId,
        startTime: Date.now(),
      });

      // Emit event
      this.eventEmitter.emit('generation.queued', {
        jobId: job.id,
        ticketId,
        jiraKey: ticket.jira_key,
      });

      return {
        jobId: job.id,
        status: 'queued',
      };
    } catch (error) {
      this.logger.error(`Failed to queue generation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate test cases (called by worker)
   */
  async generateTestCases(
    ticketId: string,
    jiraKey: string,
    parsedData: any,
    userId: string,
    projectKey: string,
    testTypes: TestCaseType[],
    focusArea?: string,
  ): Promise<TestCase[]> {
    try {
      this.logger.log(
        `Generating test cases for ticket ${jiraKey}, types: ${testTypes.join(', ')}`,
      );

      const createdCases: TestCase[] = [];

      // Generate test cases for each type
      for (const testType of testTypes) {
        try {
          const testCase = await this.generateSingleTestCase(
            ticketId,
            jiraKey,
            parsedData,
            userId,
            projectKey,
            testType,
            focusArea,
            createdCases.length + 1,
          );

          if (testCase) {
            createdCases.push(testCase);
          }
        } catch (error) {
          this.logger.error(
            `Failed to generate ${testType} test case: ${error.message}`,
          );
          // Continue with next type
        }
      }

      this.logger.log(
        `Generated ${createdCases.length} test cases for ticket ${jiraKey}`,
      );

      // Emit event
      this.eventEmitter.emit('generation.completed', {
        ticketId,
        jiraKey,
        testCaseCount: createdCases.length,
        totalTokens: createdCases.reduce((sum, tc) => sum + tc.tokens_used, 0),
        totalCostEur: createdCases.reduce((sum, tc) => sum + tc.cost_eur, 0),
      });

      return createdCases;
    } catch (error) {
      this.logger.error(
        `Error generating test cases for ${jiraKey}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate a single test case
   */
  private async generateSingleTestCase(
    ticketId: string,
    jiraKey: string,
    parsedData: any,
    userId: string,
    projectKey: string,
    testType: TestCaseType,
    focusArea: string | undefined,
    sequenceNumber: number,
  ): Promise<TestCase | null> {
    try {
      // Check if already exists
      const existing = await this.generatorRepository.findDuplicates(
        ticketId,
        testType,
      );
      if (existing.length > 0) {
        this.logger.debug(`Test case ${testType} already exists for ${jiraKey}`);
        return null;
      }

      // Build prompt
      const requirement = { ...parsedData, focus_area: focusArea };
      const prompt = generateTestCasePrompt(requirement, [testType]);

      // Estimate cost
      const estimatedTokens = estimateGenerationTokens(requirement);
      const estimatedCost = this.tokenTracker.estimateCost(
        estimatedTokens,
        'openai',
        'gpt-4o',
      );

      // Check budget
      const budgetCheck = await this.budgetManager.checkBudget(
        userId,
        estimatedCost,
        'generate',
      );

      if (!budgetCheck.allowed) {
        throw new BadRequestException(budgetCheck.reason);
      }

      // Call LLM
      const response = await this.llmService.call(
        LLMOptionsBuilder.create()
          .model(OPENAI_GENERATION_CONFIG.model)
          .messages('system', getGenerationSystemPrompt())
          .messages('user', prompt)
          .temperature(OPENAI_GENERATION_CONFIG.temperature)
          .maxTokens(OPENAI_GENERATION_CONFIG.maxTokens)
          .provider(LLMProvider.OPENAI)
          .userId(userId)
          .action('generate')
          .timeout(OPENAI_GENERATION_CONFIG.timeout)
          .responseFormat('json')
          .build(),
      );

      // Parse and validate response
      let testCaseData;
      try {
        const parsed = JSON.parse(response.content);
        // If array, take first item
        const item = Array.isArray(parsed) ? parsed[0] : parsed;
        testCaseData = TestCaseDataSchema.parse(item);
      } catch (error) {
        this.logger.warn(
          `Failed to parse LLM response for ${jiraKey}: ${error.message}`,
        );
        // Use fallback
        testCaseData = generateFallbackTestCase(
          ticketId,
          testType,
          requirement.title,
        );
      }

      // Generate test case ID
      const testCaseId = generateTestCaseId(
        projectKey,
        parseInt(jiraKey.split('-')[1]),
        sequenceNumber,
      );

      // Create test case
      const testCase = await this.generatorRepository.createTestCase({
        test_case_id: testCaseId,
        ticket_id: ticketId,
        jira_key: jiraKey,
        project_key: projectKey,
        title: testCaseData.title,
        description: testCaseData.description,
        type: testType,
        preconditions: testCaseData.preconditions,
        postconditions: testCaseData.postconditions,
        steps: testCaseData.steps,
        created_by: userId,
        tokens_used: response.tokens.output,
        cost_eur: response.cost_eur,
        raw_ai_response: response.content,
        tags: [projectKey, testType, 'ai-generated'],
      });

      // Record spending
      await this.budgetManager.recordSpending(
        userId,
        response.cost_eur,
        'generate',
      );

      this.logger.log(`Created test case ${testCaseId} for ${jiraKey}`);

      return testCase;
    } catch (error) {
      this.logger.error(
        `Error generating ${testType} test case: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * List jobs in the queue
   */
  async listQueue(
    status?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ jobs: any[]; total: number }> {
    try {
      this.logger.log(`Listing queue. Status: ${status || 'all'}, Limit: ${limit}, Offset: ${offset}`);
      
      // Map frontend status to BullMQ JobState
      const getBullMQStatuses = (s?: string): any[] => {
        if (!s) return ['active', 'waiting', 'completed', 'failed', 'delayed'];
        if (s === 'pending') return ['waiting'];
        if (s === 'in_progress') return ['active'];
        return [s];
      };

      const statuses = getBullMQStatuses(status);
      this.logger.debug(`Querying BullMQ for states: ${statuses.join(', ')}`);

      // Fetch jobs
      const jobs = await this.generationQueue.getJobs(statuses, offset, offset + limit - 1, true);
      this.logger.debug(`Retrieved ${jobs?.length || 0} jobs`);

      // Get total counts
      const counts = await this.generationQueue.getJobCounts();
      this.logger.debug(`Queue totals: ${JSON.stringify(counts)}`);

      // Map count based on status
      let total = 0;
      if (status) {
        if (status === 'pending') total = counts.wait || 0;
        else if (status === 'in_progress') total = counts.active || 0;
        else total = (counts as any)[status] || 0;
      } else {
        total = Object.values(counts).reduce((acc: number, val) => (typeof val === 'number' ? acc + val : acc), 0);
      }

      // Map jobs to DTOs
      const mappedJobs = [];
      for (const job of jobs) {
        try {
          const state = await job.getState();
          const data = job.data || {};
          
          // Determine frontend-friendly status
          let mappedStatus = 'pending';
          if (state === 'active') mappedStatus = 'in_progress';
          else if (state === 'completed') mappedStatus = 'completed';
          else if (state === 'failed') mappedStatus = 'failed';

          mappedJobs.push({
            id: job.id,
            ticket_key: data.jira_key || 'Unknown',
            project_key: data.project_key || 'Unknown',
            status: mappedStatus,
            progress: typeof job.progress === 'number' ? job.progress : (typeof job.progress === 'object' ? (job.progress as any).percentage || 0 : 0),
            stage: (job.progress as any)?.stage || (state === 'active' ? 'Generating...' : state),
            error_message: job.failedReason || null,
            generated_count: (job.returnvalue as any)?.testCaseCount || 0,
            created_at: job.timestamp ? new Date(job.timestamp).toISOString() : new Date().toISOString(),
            completed_at: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
          });
        } catch (jobErr) {
          this.logger.warn(`Failed to map job ${job?.id}: ${jobErr.message}`);
        }
      }

      return {
        jobs: mappedJobs,
        total,
      };
    } catch (error) {
      this.logger.error(`Generation queue list failed: ${error.message}`, error.stack);
      
      // Check for Redis connection issues specifically
      if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection is closed')) {
        throw new Error('Queue storage (Redis) is currently unavailable. Please check system status.');
      }
      
      throw error;
    }
  }



  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.generationQueue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = typeof job.progress === 'number' ? job.progress : 0;

      return {
        jobId,
        status: state,
        progress,
        attempts: job.attemptsMade,
        result: job.progress,
        failedReason: job.failedReason,
        createdAt: new Date(job.timestamp),
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel generation job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.generationQueue.getJob(jobId);
      if (!job) {
        throw new BadRequestException(`Job ${jobId} not found`);
      }

      await job.remove();
      this.logger.log(`Cancelled job ${jobId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<{ newJobId: string }> {
    try {
      const job = await this.generationQueue.getJob(jobId);
      if (!job) {
        throw new BadRequestException(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      if (state !== 'failed') {
        throw new BadRequestException(`Job ${jobId} is not in failed state`);
      }

      // Re-queue with same data
      const newJob = await this.generationQueue.add('generate', job.data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      this.logger.log(`Retried job ${jobId} as new job ${newJob.id}`);

      return { newJobId: newJob.id };
    } catch (error) {
      this.logger.error(`Failed to retry job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get test cases for a ticket
   */
  async getTicketTestCases(
    ticketId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ cases: any[]; total: number }> {
    const result = await this.generatorRepository.getTestCasesByTicket(
      ticketId,
      limit,
      offset,
    );

    return {
      cases: result.cases.map((tc) => this.mapTestCaseToResponse(tc)),
      total: result.total,
    };
  }

  /**
   * Approve test case
   */
  async approveTestCase(
    testCaseId: string,
    approvedBy: string,
    comment?: string,
  ): Promise<any> {
    try {
      const testCase = await this.generatorRepository.updateStatus(
        testCaseId,
        'approved',
        approvedBy,
        comment,
      );

      if (!testCase) {
        throw new BadRequestException(`Test case ${testCaseId} not found`);
      }

      this.eventEmitter.emit('test_case.approved', {
        testCaseId,
        approvedBy,
      });

      return this.mapTestCaseToResponse(testCase);
    } catch (error) {
      this.logger.error(`Failed to approve test case: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject test case
   */
  async rejectTestCase(
    testCaseId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<any> {
    try {
      const testCase = await this.generatorRepository.updateStatus(
        testCaseId,
        'rejected',
        rejectedBy,
        reason,
      );

      if (!testCase) {
        throw new BadRequestException(`Test case ${testCaseId} not found`);
      }

      this.eventEmitter.emit('test_case.rejected', {
        testCaseId,
        rejectedBy,
        reason,
      });

      return this.mapTestCaseToResponse(testCase);
    } catch (error) {
      this.logger.error(`Failed to reject test case: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map test case to response DTO
   */
  private mapTestCaseToResponse(testCase: TestCase): any {
    return {
      id: testCase.id,
      ticket_id: testCase.ticket_id,
      jira_key: testCase.jira_key,
      title: testCase.title,
      description: testCase.description,
      status: testCase.status,
      type: testCase.type,
      steps: testCase.steps.map((step) => ({
        step_number: step.step_number,
        action: step.action,
        expected_result: step.expected_result,
        data: step.data,
        precondition: step.precondition,
      })),
      preconditions: testCase.preconditions,
      postconditions: testCase.postconditions,
      tags: testCase.tags,
      tokens_used: testCase.tokens_used,
      cost_eur: testCase.cost_eur,
      ai_generated: testCase.ai_generated,
      created_at: testCase.created_at.toISOString(),
      created_by: testCase.created_by,
      approved_by: testCase.approved_by,
      approval_comment: testCase.approval_comment,
    };
  }

  /**
   * Get generation statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<any> {
    return this.generatorRepository.getStatistics(startDate, endDate);
  }
}
