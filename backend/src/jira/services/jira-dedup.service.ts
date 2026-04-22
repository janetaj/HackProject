/**
 * Jira Deduplication Service
 * Detects and processes new vs updated vs unchanged tickets
 */

import { Injectable, Logger } from '@nestjs/common';
import { JiraRepository } from '../repositories/jira.repository';
import { JiraTicket } from '../entities/jira-ticket.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface DedupResult {
  newTickets: JiraTicket[];
  updatedTickets: JiraTicket[];
  unchangedTickets: JiraTicket[];
  totalProcessed: number;
}

@Injectable()
export class JiraDedupService {
  private readonly logger = new Logger(JiraDedupService.name);

  constructor(
    private jiraRepository: JiraRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process pending tickets (new/updated)
   * Deduplicates and triggers downstream processing
   */
  async processNewAndUpdatedTickets(): Promise<DedupResult> {
    this.logger.log('Starting deduplication process');

    const pendingTickets = await this.jiraRepository.findPendingProcessing();
    this.logger.debug(
      `Found ${pendingTickets.length} pending tickets (new/updated)`,
    );

    const result: DedupResult = {
      newTickets: [],
      updatedTickets: [],
      unchangedTickets: [],
      totalProcessed: 0,
    };

    for (const ticket of pendingTickets) {
      if (ticket.status === 'new') {
        result.newTickets.push(ticket);
        // Emit event to trigger parsing
        this.eventEmitter.emit('jira.ticket.new', {
          ticketId: ticket.id,
          jiraKey: ticket.jira_key,
          project: ticket.project,
        });
      } else if (ticket.status === 'updated') {
        // Check if content actually changed
        const hasContentChanged = await this.detectContentChange(ticket);

        if (hasContentChanged) {
          result.updatedTickets.push(ticket);
          // Emit event to trigger re-parsing
          this.eventEmitter.emit('jira.ticket.updated', {
            ticketId: ticket.id,
            jiraKey: ticket.jira_key,
            project: ticket.project,
          });
        } else {
          // Content didn't actually change, revert to previous status
          result.unchangedTickets.push(ticket);
          if (ticket.parsed_at) {
            // If previously parsed, mark as ready for generation
            await this.jiraRepository.updateStatus(
              ticket.id,
              'ready_for_generation',
            );
          } else {
            // If never parsed, mark as new
            await this.jiraRepository.updateStatus(ticket.id, 'new');
          }
        }
      }

      result.totalProcessed++;
    }

    this.logger.log(
      `Dedup complete: new=${result.newTickets.length}, updated=${result.updatedTickets.length}, unchanged=${result.unchangedTickets.length}`,
    );

    return result;
  }

  /**
   * Detect if ticket content has actually changed
   * Compares summary, description, and Jira fields
   */
  private async detectContentChange(ticket: JiraTicket): Promise<boolean> {
    if (!ticket.raw_content) {
      this.logger.warn(`Ticket ${ticket.id} has no raw_content, assuming changed`);
      return true;
    }

    // TODO: Store hash of previous content and compare
    // For MVP, we can compare key fields:
    // - summary
    // - description
    // - customfields (story_id, module)
    // - jira_status

    // Implementation: Generate hash of current fields and compare with stored hash
    // This is a placeholder that assumes changes are meaningful

    const hasChanges =
      ticket.raw_content?.fields?.summary ||
      ticket.raw_content?.fields?.description ||
      ticket.raw_content?.fields?.customfield_10000 ||
      ticket.raw_content?.fields?.customfield_10001;

    return !!hasChanges;
  }

  /**
   * Get tickets ready for parsing
   */
  async getReadyForParsing(): Promise<JiraTicket[]> {
    const newTickets = (
      await this.jiraRepository.findByStatus('new', 1000, 0)
    ).tickets;
    const updatedTickets = (
      await this.jiraRepository.findByStatus('updated', 1000, 0)
    ).tickets;

    return [...newTickets, ...updatedTickets];
  }

  /**
   * Mark ticket as parsed and ready for generation
   */
  async markAsParsed(ticketId: string, parsedData: any): Promise<JiraTicket | null> {
    return this.jiraRepository.updateParsedFields(ticketId, parsedData);
  }

  /**
   * Batch skip tickets (e.g., if they don't meet criteria)
   */
  async skipTickets(
    ticketIds: string[],
    reason?: string,
  ): Promise<void> {
    const jiraKeys: string[] = [];
    for (const ticketId of ticketIds) {
      const ticket = await this.jiraRepository.findOne({
        where: { id: ticketId },
      });
      if (ticket) {
        jiraKeys.push(ticket.jira_key);
        this.logger.debug(
          `Skipping ticket ${ticket.jira_key}${reason ? ` (${reason})` : ''}`,
        );
      }
    }
    if (jiraKeys.length > 0) {
      await this.jiraRepository.markAsSkipped(jiraKeys);
    }
  }

  /**
   * Hash content for change detection
   * Simple hash function for MVP
   */
  private hashContent(content: any): string {
    const str = JSON.stringify({
      summary: content?.fields?.summary,
      description: content?.fields?.description,
      status: content?.fields?.status?.name,
      cf10000: content?.fields?.customfield_10000,
      cf10001: content?.fields?.customfield_10001,
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clean up old duplicate entries
   */
  async cleanupDuplicates(): Promise<number> {
    // TODO: Implement logic to find and remove duplicate tickets
    // Could be tickets with same jira_key but different IDs
    this.logger.log('Cleanup duplicates - TODO implementation');
    return 0;
  }

  /**
   * Get dedup statistics
   */
  async getStatistics(): Promise<{
    totalTickets: number;
    newTickets: number;
    updatedTickets: number;
    parsingTickets: number;
    readyForGenerationTickets: number;
    completedTickets: number;
  }> {
    const total = await this.jiraRepository.count();
    const newCount = (await this.jiraRepository.findByStatus('new', 1000, 0))
      .total;
    const updatedCount = (
      await this.jiraRepository.findByStatus('updated', 1000, 0)
    ).total;
    const parsingCount = (
      await this.jiraRepository.findByStatus('parsing', 1000, 0)
    ).total;
    const readyCount = (
      await this.jiraRepository.findByStatus('ready_for_generation', 1000, 0)
    ).total;
    const completedCount = (
      await this.jiraRepository.findByStatus('completed', 1000, 0)
    ).total;

    return {
      totalTickets: total,
      newTickets: newCount,
      updatedTickets: updatedCount,
      parsingTickets: parsingCount,
      readyForGenerationTickets: readyCount,
      completedTickets: completedCount,
    };
  }
}
