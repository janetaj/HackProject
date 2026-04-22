/**
 * Base MCP Adapter
 * Abstract class for MCP (Model Context Protocol) integrations
 */

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MCPProvider {
  name: string;
  version: string;
  capabilities: string[];
}

export abstract class BaseMCPAdapter {
  /**
   * Get provider information
   */
  abstract getProvider(): MCPProvider;

  /**
   * Initialize connection to MCP provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Check if provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Execute a tool call against the MCP provider
   */
  abstract executeTool(toolCall: MCPToolCall): Promise<MCPToolResult>;

  /**
   * List available tools
   */
  abstract listTools(): Promise<
    Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>
  >;

  /**
   * Format tool result for LLM context
   */
  protected formatToolResult(result: MCPToolResult): string {
    if (result.success) {
      return `Tool executed successfully: ${JSON.stringify(result.data)}`;
    }
    return `Tool error: ${result.error}`;
  }

  /**
   * Validate tool call parameters
   */
  protected validateParameters(
    toolCall: MCPToolCall,
    schema: Record<string, any>,
  ): boolean {
    for (const [key, validator] of Object.entries(schema)) {
      if (!toolCall.arguments[key]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Retry logic helper
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(delayMs * attempt);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
