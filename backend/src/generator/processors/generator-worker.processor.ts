/**
 * Generator Worker Processor
 * BullMQ job processor for test case generation using @nestjs/bullmq
 */

import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GeneratorService } from '../services/generator.service';
import { GenerationQueueRequest } from '../dto/generation-request.dto';

@Processor('test-generation-queue')
@Injectable()
export class GeneratorWorkerProcessor extends WorkerHost {
  private readonly logger = new Logger(GeneratorWorkerProcessor.name);

  constructor(private generatorService: GeneratorService) {
    super();
  }

  /**
   * Process test case generation job
   */
  async process(job: Job<GenerationQueueRequest, any, string>): Promise<any> {
    if (job.name !== 'generate') {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    this.logger.log(`Processing generation job: ${job.id} for ticket ${job.data.ticket_id}`);

    const startTime = Date.now();

    try {
      // Update job progress
      await job.updateProgress(10);

      // Fetch parsed ticket data
      const ticket = job.data;

      // Generate test cases
      const testCases = await this.generatorService.generateTestCases(
        ticket.ticket_id,
        ticket.jira_key,
        ticket.parsed_data,
        ticket.user_id,
        ticket.project_key,
        ticket.test_case_types,
        ticket.focus_area,
      );

      await job.updateProgress(90);

      const duration = Date.now() - startTime;

      this.logger.log(
        `Generation job ${job.id} completed: ${testCases.length} test cases in ${duration}ms`,
      );

      return {
        success: true,
        testCaseCount: testCases.length,
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Generation job ${job.id} failed: ${error.message}`,
        error.stack,
      );

      // Check retry count
      if (job.attemptsMade < job.opts.attempts! - 1) {
        this.logger.log(
          `Retrying generation job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
        );
        throw error; // Throw to trigger retry
      } else {
        // Final failure - mark as failed
        return {
          success: false,
          error: error.message,
          attempts: job.attemptsMade,
          timestamp: new Date(),
        };
      }
    }
  }

  /**
   * Event handler: Job started
   */
  @OnWorkerEvent('active')
  onActive(job: Job<GenerationQueueRequest>): void {
    this.logger.debug(`Job ${job.id} started`);
  }

  /**
   * Event handler: Job completed
   */
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<GenerationQueueRequest>, result: any): Promise<void> {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
  }

  /**
   * Event handler: Job failed
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<GenerationQueueRequest> | undefined, error: Error): Promise<void> {
    this.logger.error(
      `Job ${job?.id} failed: ${error.message}`,
      error.stack,
    );
  }

  /**
   * Event handler: Worker error
   */
  @OnWorkerEvent('error')
  onError(error: Error): void {
    this.logger.error(`Worker error: ${error.message}`, error.stack);
  }
}
