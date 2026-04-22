/**
 * Jira Poller Service
 * Scheduled job to poll Jira Cloud at regular intervals
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JiraService } from './jira.service';
import { UsersService } from '../../users/users.service';
import { loadConfiguration } from '../../config/config.module';

export interface PollMetrics {
  projectsPolled: number;
  ticketsFetched: number;
  ticketsNew: number;
  ticketsUpdated: number;
  ticketsUnchanged: number;
  timestamp: Date;
  duration: number; // milliseconds
}

@Injectable()
export class JiraPollerService {
  private readonly logger = new Logger(JiraPollerService.name);
  private isPolling = false;
  private lastPollMetrics: PollMetrics | null = null;

  constructor(
    private jiraService: JiraService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  /**
   * Scheduled polling task - runs every 2 minutes
   * Requires at least one admin user with Jira token configured
   */
  @Cron('0 */2 * * * *')  // Every 2 minutes
  async pollJiraTickets(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('Poller already running, skipping this cycle');
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting Jira polling cycle');

      // TODO: Get list of projects from config or database
      // For MVP, poll all projects accessible by first admin
      const adminUsers = await this.usersService.findByRole('admin');
      if (adminUsers.length === 0) {
        this.logger.warn(
          'No admin users found. Jira polling requires at least one admin with Jira token.',
        );
        return;
      }

      const adminUser = adminUsers[0];
      if (!process.env.JIRA_API_TOKEN || !process.env.JIRA_EMAIL) {
        this.logger.warn(
          `Global JIRA_API_TOKEN or JIRA_EMAIL is not configured in .env`,
        );
        return;
      }

      // Fetch accessible projects
      const projects = await this.jiraService.getAccessibleProjects(
        adminUser.id,
      );
      this.logger.debug(`Found ${projects.length} accessible projects`);

      const metrics: PollMetrics = {
        projectsPolled: 0,
        ticketsFetched: 0,
        ticketsNew: 0,
        ticketsUpdated: 0,
        ticketsUnchanged: 0,
        timestamp: new Date(),
        duration: 0,
      };

      // Poll each project
      for (const project of projects) {
        try {
          this.logger.debug(`Polling project: ${project.key}`);
          const result = await this.jiraService.syncProjectTickets(
            adminUser.id,
            project.key,
            false, // force = false (incremental sync)
          );

          metrics.projectsPolled++;
          metrics.ticketsFetched += result.ticketsFetched;
          metrics.ticketsNew += result.ticketsNew;
          metrics.ticketsUpdated += result.ticketsUpdated;
          metrics.ticketsUnchanged += result.ticketsUnchanged;

          this.logger.debug(
            `Project ${project.key}: fetched=${result.ticketsFetched}, new=${result.ticketsNew}, updated=${result.ticketsUpdated}`,
          );
        } catch (error) {
          this.logger.error(
            `Error polling project ${project.key}: ${error.message}`,
          );
          // Continue with other projects on error
          continue;
        }
      }

      metrics.duration = Date.now() - startTime;
      this.lastPollMetrics = metrics;

      this.logger.log(
        `Polling cycle complete: projects=${metrics.projectsPolled}, fetched=${metrics.ticketsFetched}, new=${metrics.ticketsNew}, updated=${metrics.ticketsUpdated}, duration=${metrics.duration}ms`,
      );

      // Trigger deduplication and auto-queuing (TODO)
      // await this.dedupService.processNewTickets();
    } catch (error) {
      this.logger.error(`Fatal error in Jira polling: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Get the last polling metrics (for monitoring/debugging)
   */
  getLastMetrics(): PollMetrics | null {
    return this.lastPollMetrics;
  }

  /**
   * Check if poller is currently running
   */
  isRunning(): boolean {
    return this.isPolling;
  }

  /**
   * Manual trigger for polling (e.g., from controller)
   */
  async triggerManual(projectKey?: string): Promise<PollMetrics> {
    if (this.isPolling) {
      throw new Error('Poller is already running. Please try again later.');
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      const adminUsers = await this.usersService.findByRole('admin');
      if (adminUsers.length === 0) {
        throw new Error(
          'No admin users found with Jira token for manual polling',
        );
      }

      const adminUser = adminUsers[0];

      const metrics: PollMetrics = {
        projectsPolled: 0,
        ticketsFetched: 0,
        ticketsNew: 0,
        ticketsUpdated: 0,
        ticketsUnchanged: 0,
        timestamp: new Date(),
        duration: 0,
      };

      if (projectKey) {
        // Poll specific project
        const result = await this.jiraService.syncProjectTickets(
          adminUser.id,
          projectKey,
          true, // force = true (full sync)
        );
        metrics.projectsPolled = 1;
        metrics.ticketsFetched = result.ticketsFetched;
        metrics.ticketsNew = result.ticketsNew;
        metrics.ticketsUpdated = result.ticketsUpdated;
        metrics.ticketsUnchanged = result.ticketsUnchanged;
      } else {
        // Poll all projects
        const projects = await this.jiraService.getAccessibleProjects(
          adminUser.id,
        );
        for (const project of projects) {
          const result = await this.jiraService.syncProjectTickets(
            adminUser.id,
            project.key,
            true,
          );
          metrics.projectsPolled++;
          metrics.ticketsFetched += result.ticketsFetched;
          metrics.ticketsNew += result.ticketsNew;
          metrics.ticketsUpdated += result.ticketsUpdated;
          metrics.ticketsUnchanged += result.ticketsUnchanged;
        }
      }

      metrics.duration = Date.now() - startTime;
      this.lastPollMetrics = metrics;
      return metrics;
    } finally {
      this.isPolling = false;
    }
  }
}
