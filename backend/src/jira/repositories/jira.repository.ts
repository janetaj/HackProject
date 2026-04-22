/**
 * Jira Repository
 * Custom repository methods for JiraTicket entity
 */

import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { JiraTicket, JiraTicketStatus } from '../entities/jira-ticket.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JiraRepository extends Repository<JiraTicket> {
  constructor(private dataSource: DataSource) {
    super(JiraTicket, dataSource.createEntityManager());
  }

  /**
   * Find a ticket by Jira key (e.g., PROJ-123)
   */
  async findByKey(jiraKey: string): Promise<JiraTicket | null> {
    return this.findOne({
      where: { jira_key: jiraKey },
    });
  }

  /**
   * Find a ticket by Jira ID
   */
  async findByJiraId(jiraId: string): Promise<JiraTicket | null> {
    return this.findOne({
      where: { jira_id: jiraId },
    });
  }

  /**
   * Find all tickets for a project
   */
  async findByProject(
    project: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ tickets: JiraTicket[]; total: number }> {
    const [tickets, total] = await this.findAndCount({
      where: { project },
      take: limit,
      skip: offset,
      order: { updated_at: 'DESC' },
    });
    return { tickets, total };
  }

  /**
   * Find all tickets regardless of project
   */
  async findAll(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ tickets: JiraTicket[]; total: number }> {
    const [tickets, total] = await this.findAndCount({
      take: limit,
      skip: offset,
      order: { updated_at: 'DESC' },
    });
    return { tickets, total };
  }

  /**
   * Find all tickets with a specific status
   */
  async findByStatus(
    status: JiraTicketStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ tickets: JiraTicket[]; total: number }> {
    const [tickets, total] = await this.findAndCount({
      where: { status },
      take: limit,
      skip: offset,
      order: { updated_at: 'DESC' },
    });
    return { tickets, total };
  }

  /**
   * Find all tickets with status 'new' or 'updated'
   */
  async findPendingProcessing(): Promise<JiraTicket[]> {
    return this.find({
      where: [{ status: 'new' }, { status: 'updated' }],
      order: { updated_at: 'ASC' },
    });
  }

  /**
   * Find all tickets in 'parsing' status (to detect stuck jobs)
   */
  async findParsingTickets(): Promise<JiraTicket[]> {
    return this.find({
      where: { status: 'parsing' },
    });
  }

  /**
   * Upsert (insert or update) a ticket
   * Returns [ticket, wasNew: boolean]
   */
  async upsertTicket(
    jiraKey: string,
    jiraId: string,
    data: {
      project: string;
      summary: string;
      description: string;
      jira_status: string;
      raw_content: any;
      story_id?: string | null;
      module?: string | null;
      acceptance_criteria?: string[];
      headers?: string[];
    },
  ): Promise<[JiraTicket, boolean]> {
    let ticket = await this.findByKey(jiraKey);
    let wasNew = false;

    if (!ticket) {
      wasNew = true;
      ticket = new JiraTicket();
      ticket.id = uuidv4();
      ticket.jira_key = jiraKey;
      ticket.jira_id = jiraId;
      ticket.status = 'new';
    }

    // Update fields
    ticket.project = data.project;
    ticket.summary = data.summary;
    ticket.description = data.description;
    ticket.jira_status = data.jira_status;
    ticket.raw_content = data.raw_content;
    ticket.fetched_at = new Date();

    if (data.story_id !== undefined) ticket.story_id = data.story_id;
    if (data.module !== undefined) ticket.module = data.module;
    if (data.acceptance_criteria)
      ticket.acceptance_criteria = data.acceptance_criteria;
    if (data.headers) ticket.headers = data.headers;

    // If updating, change status to 'updated' only if it's not parsing or generating
    if (
      !wasNew &&
      !['parsing', 'generation_queued', 'generating'].includes(ticket.status)
    ) {
      ticket.status = 'updated';
    }

    await this.save(ticket);
    return [ticket, wasNew];
  }

  /**
   * Update ticket status
   */
  async updateStatus(
    ticketId: string,
    status: JiraTicketStatus,
  ): Promise<JiraTicket | null> {
    await this.update({ id: ticketId }, { status });
    return this.findOne({ where: { id: ticketId } });
  }

  /**
   * Update parsed fields
   */
  async updateParsedFields(
    ticketId: string,
    parsedFields: any,
  ): Promise<JiraTicket | null> {
    await this.update(
      { id: ticketId },
      {
        parsed_fields: parsedFields,
        parsed_at: new Date(),
        status: 'ready_for_generation',
      },
    );
    return this.findOne({ where: { id: ticketId } });
  }

  /**
   * Find tickets with status between two dates (for polling window)
   */
  async findModifiedSince(
    project: string,
    since: Date,
  ): Promise<JiraTicket[]> {
    return this.find({
      where: { project },
      order: { updated_at: 'DESC' },
    });
    // Note: In real implementation, filter by Jira's modified date
    // This would use a separate timestamp tracking the last poll
  }

  /**
   * Get statistics by status for a project
   */
  async getProjectStatistics(project: string): Promise<Record<string, number>> {
    const statuses: JiraTicketStatus[] = [
      'new',
      'updated',
      'parsing',
      'ready_for_generation',
      'generation_queued',
      'generating',
      'completed',
      'skipped',
    ];
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      stats[status] = await this.count({
        where: { project, status },
      });
    }

    return stats;
  }

  /**
   * Bulk mark tickets as skipped (when feature flag disabled, etc)
   */
  async markAsSkipped(jiraKeys: string[]): Promise<void> {
    if (jiraKeys.length === 0) return;
    await this.update(
      { jira_key: jiraKeys as any },
      { status: 'skipped' as any },
    );
  }

  /**
   * Delete older tickets (data cleanup)
   */
  async deleteOlderThan(cutoffDate: Date): Promise<number> {
    const result = await this.delete({
      created_at: cutoffDate,
    });
    return result.affected || 0;
  }
}
