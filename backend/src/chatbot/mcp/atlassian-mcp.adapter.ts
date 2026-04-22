/**
 * Atlassian MCP Adapter
 * Implementation for Atlassian (Jira) MCP provider
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  BaseMCPAdapter,
  MCPToolCall,
  MCPToolResult,
  MCPProvider,
} from './base-mcp.adapter';

@Injectable()
export class AtlassianMCPAdapter extends BaseMCPAdapter {
  private readonly logger = new Logger(AtlassianMCPAdapter.name);
  private initialized = false;

  getProvider(): MCPProvider {
    return {
      name: 'atlassian',
      version: '1.0.0',
      capabilities: [
        'search_jira',
        'get_issue',
        'list_projects',
        'get_epic',
        'get_sprints',
        'link_issue',
      ],
    };
  }

  async initialize(): Promise<void> {
    try {
      // In production, validate connection to Jira
      this.initialized = true;
      this.logger.log('Atlassian MCP adapter initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Atlassian MCP adapter:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }
    // In production, check Atlassian API health
    return true;
  }

  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (toolCall.name) {
        case 'search_jira':
          return await this.searchJira(toolCall.arguments as any);
        case 'get_issue':
          return await this.getIssue(toolCall.arguments as any);
        case 'list_projects':
          return await this.listProjects();
        case 'get_epic':
          return await this.getEpic(toolCall.arguments as any);
        case 'get_sprints':
          return await this.getSprints(toolCall.arguments as any);
        case 'link_issue':
          return await this.linkIssue(toolCall.arguments as any);
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolCall.name}`,
          };
      }
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolCall.name}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listTools(): Promise<
    Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>
  > {
    return [
      {
        name: 'search_jira',
        description: 'Search for Jira issues using JQL',
        parameters: {
          jql: 'string (required)',
          limit: 'number (optional, default 10)',
        },
      },
      {
        name: 'get_issue',
        description: 'Get detailed information about a specific Jira issue',
        parameters: {
          issueKey: 'string (required, e.g., PROJ-123)',
        },
      },
      {
        name: 'list_projects',
        description: 'List all Jira projects',
        parameters: {},
      },
      {
        name: 'get_epic',
        description: 'Get epic details',
        parameters: {
          epicKey: 'string (required)',
        },
      },
      {
        name: 'get_sprints',
        description: 'Get sprints for a project',
        parameters: {
          projectKey: 'string (required)',
        },
      },
      {
        name: 'link_issue',
        description: 'Link two issues',
        parameters: {
          sourceIssueKey: 'string (required)',
          targetIssueKey: 'string (required)',
          linkType: 'string (required, e.g., relates to)',
        },
      },
    ];
  }

  private async searchJira(args: {
    jql: string;
    limit?: number;
  }): Promise<MCPToolResult> {
    // Mock implementation - in production, call Jira REST API
    return this.retryWithBackoff(async () => {
      // Simulate API call
      return {
        success: true,
        data: {
          issues: [
            {
              key: 'PROJ-123',
              summary: 'Sample issue from Jira',
              status: 'In Progress',
              assignee: 'user@example.com',
            },
          ],
          count: 1,
          jql: args.jql,
        },
      };
    });
  }

  private async getIssue(args: { issueKey: string }): Promise<MCPToolResult> {
    return this.retryWithBackoff(async () => {
      return {
        success: true,
        data: {
          key: args.issueKey,
          summary: 'Issue summary from Jira',
          description: 'Detailed description',
          status: 'In Progress',
          priority: 'High',
          type: 'Task',
          assignee: 'user@example.com',
          created: new Date(),
          updated: new Date(),
        },
      };
    });
  }

  private async listProjects(): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        projects: [
          {
            key: 'PROJ',
            name: 'Test Project',
            type: 'software',
          },
          {
            key: 'QA',
            name: 'QA Project',
            type: 'software',
          },
        ],
      },
    };
  }

  private async getEpic(args: { epicKey: string }): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        key: args.epicKey,
        name: 'Epic name',
        status: 'In Progress',
        issues: ['PROJ-123', 'PROJ-124'],
        progress: 50,
      },
    };
  }

  private async getSprints(args: {
    projectKey: string;
  }): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        sprints: [
          {
            id: 1,
            name: 'Sprint 1',
            status: 'Active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    };
  }

  private async linkIssue(args: {
    sourceIssueKey: string;
    targetIssueKey: string;
    linkType: string;
  }): Promise<MCPToolResult> {
    return {
      success: true,
      data: {
        message: `Linked ${args.sourceIssueKey} to ${args.targetIssueKey} with link type "${args.linkType}"`,
      },
    };
  }
}
