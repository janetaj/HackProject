/**
 * MCP Registry Service
 * Central registry for MCP providers and tool execution routing
 */

import { Injectable, Logger } from '@nestjs/common';
import { BaseMCPAdapter, MCPToolCall, MCPToolResult } from './base-mcp.adapter';
import { AtlassianMCPAdapter } from './atlassian-mcp.adapter';

@Injectable()
export class MCPRegistryService {
  private readonly logger = new Logger(MCPRegistryService.name);
  private providers: Map<string, BaseMCPAdapter> = new Map();

  constructor(private atlassianAdapter: AtlassianMCPAdapter) {
    this.registerProviders();
  }

  /**
   * Register all available MCP providers
   */
  private registerProviders(): void {
    this.providers.set('atlassian', this.atlassianAdapter);
    this.logger.log('MCP providers registered: ' + Array.from(this.providers.keys()).join(', '));
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): BaseMCPAdapter | null {
    return this.providers.get(name) || null;
  }

  /**
   * List all registered providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Execute tool across all providers (auto-routing)
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    // Map tool names to providers
    const toolProviderMap = {
      search_jira: 'atlassian',
      get_issue: 'atlassian',
      list_projects: 'atlassian',
      get_epic: 'atlassian',
      get_sprints: 'atlassian',
      link_issue: 'atlassian',
    };

    const providerName = toolProviderMap[toolName];
    if (!providerName) {
      this.logger.warn(`Unknown tool: ${toolName}`);
      return {
        success: false,
        error: `Unknown tool: ${toolName}. Available tools: ${Object.keys(toolProviderMap).join(', ')}`,
      };
    }

    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerName} not available`,
      };
    }

    try {
      // Check provider availability
      const available = await provider.isAvailable();
      if (!available) {
        this.logger.warn(`Provider ${providerName} is not available, falling back to cache`);
        return {
          success: false,
          error: `Provider ${providerName} is temporarily unavailable`,
        };
      }

      // Execute tool
      const toolCall: MCPToolCall = {
        name: toolName,
        arguments: args,
      };

      return await provider.executeTool(toolCall);
    } catch (error) {
      this.logger.error(`Tool execution failed: ${toolName}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all tools from all providers
   */
  async listAllAvailableTools(): Promise<
    Array<{
      provider: string;
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>
  > {
    const allTools = [];

    for (const [providerName, provider] of this.providers) {
      try {
        const tools = await provider.listTools();
        tools.forEach((tool) => {
          allTools.push({
            provider: providerName,
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          });
        });
      } catch (error) {
        this.logger.error(`Failed to list tools from ${providerName}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Get tools by provider
   */
  async getProviderTools(providerName: string): Promise<
    Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>
  > {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.listTools();
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health = {};

    for (const [providerName, provider] of this.providers) {
      try {
        health[providerName] = await provider.isAvailable();
      } catch (error) {
        this.logger.error(`Health check failed for ${providerName}:`, error);
        health[providerName] = false;
      }
    }

    return health;
  }
}
