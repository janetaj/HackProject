/**
 * Jira Service
 * Handles Jira Cloud API integration, polling, and ticket management
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { JiraRepository } from '../repositories/jira.repository';
import { UsersService } from '../../users/users.service';
import { JiraTicket, JiraTicketStatus } from '../entities/jira-ticket.entity';
import { v4 as uuidv4 } from 'uuid';

interface JiraCloudIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: {
      name: string;
    };
    customfield_10000?: string; // Story ID (example custom field)
    customfield_10001?: string; // Module (example custom field)
  };
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);
  private axiosInstance: AxiosInstance;

  constructor(
    private jiraRepository: JiraRepository,
    private usersService: UsersService,
  ) {
    this.axiosInstance = axios.create({
      baseURL: 'https://your-jira-instance.atlassian.net/rest/api/3',
      timeout: 30000,
    });
  }

  /**
   * Authenticate with Jira using user's stored token
   */
  private async authenticateUser(userId: string): Promise<AxiosInstance> {
    // Read from .env file for system-wide Jira connection instead of validating per-user
    const jiraToken = process.env.JIRA_API_TOKEN;
    const jiraEmail = process.env.JIRA_EMAIL;
    const baseUrl = process.env.JIRA_BASE_URL || 'https://your-jira-instance.atlassian.net';

    if (!jiraToken || !jiraEmail) {
      throw new Error(
        'Jira credentials not configured in .env file (JIRA_API_TOKEN, JIRA_EMAIL)'
      );
    }

    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`;

    const client = axios.create({
      baseURL: `${baseUrl}/rest/api/3`,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return client;
  }

  /**
   * Fetch issues from Jira Cloud using JQL
   */
  async fetchIssuesFromJira(
    userId: string,
    projectKey?: string,
    jql?: string,
  ): Promise<JiraCloudIssue[]> {
    try {
      const client = await this.authenticateUser(userId);
      const query = jql || (projectKey && projectKey !== 'all' ? `project = "${projectKey}" ORDER BY updated DESC` : `project IS NOT EMPTY ORDER BY updated DESC`);

      const response = await client.get('/search/jql', {
        params: {
          jql: query,
          maxResults: 100,
          fields: [
            'summary',
            'description',
            'status',
            'customfield_10000',
            'customfield_10001',
          ].join(','),
        },
      });

      return response.data.issues || [];
    } catch (error) {
      this.logger.error(`Failed to fetch issues from Jira: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync tickets from Jira for a specific project
   * Returns metrics about what was synced
   */
  async syncProjectTickets(
    userId: string,
    projectKey: string,
    force: boolean = false,
  ): Promise<{
    ticketsFetched: number;
    ticketsNew: number;
    ticketsUpdated: number;
    ticketsUnchanged: number;
  }> {
    this.logger.log(`Syncing tickets for project ${projectKey}`);

    try {
      const jiraIssues = await this.fetchIssuesFromJira(
        userId,
        projectKey,
      );
      this.logger.debug(`Fetched ${jiraIssues.length} issues from Jira`);

      let ticketsNew = 0;
      let ticketsUpdated = 0;
      let ticketsUnchanged = 0;

      for (const issue of jiraIssues) {
        const [ticket, wasNew] = await this.jiraRepository.upsertTicket(
          issue.key,
          issue.id,
          {
            project: projectKey,
            summary: issue.fields.summary,
            description: typeof issue.fields.description === 'object' ? JSON.stringify(issue.fields.description) : (issue.fields.description || ''),
            jira_status: issue.fields.status.name,
            story_id: issue.fields.customfield_10000,
            module: issue.fields.customfield_10001,
            raw_content: issue,
          },
        );

        if (wasNew) {
          ticketsNew++;
          this.logger.debug(`New ticket: ${issue.key}`);
        } else if (ticket.status === 'updated') {
          ticketsUpdated++;
          this.logger.debug(`Updated ticket: ${issue.key}`);
        } else {
          ticketsUnchanged++;
        }
      }

      return {
        ticketsFetched: jiraIssues.length,
        ticketsNew,
        ticketsUpdated,
        ticketsUnchanged,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing project ${projectKey}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get all projects accessible by the user
   */
  async getAccessibleProjects(userId: string): Promise<
    Array<{
      key: string;
      name: string;
      id: string;
    }>
  > {
    try {
      const client = await this.authenticateUser(userId);
      const response = await client.get('/project/search', {
        params: { maxResults: 50 },
      });

      return response.data.values.map((p: any) => ({
        key: p.key,
        name: p.name,
        id: p.id,
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch projects: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all tickets in a specific status
   */
  async getTicketsByStatus(
    status: JiraTicketStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    tickets: JiraTicket[];
    total: number;
  }> {
    return this.jiraRepository.findByStatus(status, limit, offset);
  }

  /**
   * Get all tickets for a specific project
   */
  async getTicketsByProject(
    projectKey: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    tickets: JiraTicket[];
    total: number;
  }> {
    return this.jiraRepository.findByProject(projectKey, limit, offset);
  }

  /**
   * Get all tickets
   */
  async getAllTickets(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    tickets: JiraTicket[];
    total: number;
  }> {
    return this.jiraRepository.findAll(limit, offset);
  }

  /**
   * Get all tickets pending processing (new or updated)
   */
  async getPendingTickets(): Promise<JiraTicket[]> {
    return this.jiraRepository.findPendingProcessing();
  }

  /**
   * Retrieve a single ticket by ID
   */
  async getTicketById(ticketId: string): Promise<JiraTicket | null> {
    return this.jiraRepository.findOne({ where: { id: ticketId } });
  }

  /**
   * Retrieve a ticket by Jira key
   */
  async getTicketByKey(jiraKey: string): Promise<JiraTicket | null> {
    return this.jiraRepository.findByKey(jiraKey);
  }

  /**
   * Get project statistics (count by status)
   */
  async getProjectStatistics(projectKey: string): Promise<Record<string, number>> {
    return this.jiraRepository.getProjectStatistics(projectKey);
  }

  /**
   * Mark tickets as part of generation queue
   */
  async markForGeneration(ticketIds: string[]): Promise<void> {
    for (const ticketId of ticketIds) {
      await this.jiraRepository.updateStatus(
        ticketId,
        'generation_queued',
      );
    }
    this.logger.debug(`Marked ${ticketIds.length} tickets for generation`);
  }

  /**
   * Update ticket parsed content
   */
  async updateTicketParsedContent(
    ticketId: string,
    parsedFields: any,
  ): Promise<JiraTicket | null> {
    return this.jiraRepository.updateParsedFields(ticketId, parsedFields);
  }

  /**
   * Skip tickets that shouldn't be processed
   */
  async skipTickets(jiraKeys: string[]): Promise<void> {
    await this.jiraRepository.markAsSkipped(jiraKeys);
    this.logger.debug(`Skipped ${jiraKeys.length} tickets`);
  }

  /**
   * Validate Jira token for a user
   */
  async validateJiraToken(userId: string): Promise<boolean> {
    try {
      const client = await this.authenticateUser(userId);
      const response = await client.get('/myself');
      return !!response.data.accountId;
    } catch (error) {
      this.logger.warn(
        `Jira token validation failed for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }
}
