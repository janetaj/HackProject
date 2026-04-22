/**
 * MCP (Model Context Protocol) Provider Abstraction Interface
 * Defines the contract for MCP adapters (Atlassian, Confluence, Slack, etc.)
 */

export enum MCPProviderType {
  ATLASSIAN = 'atlassian',
  CONFLUENCE = 'confluence',
  SLACK = 'slack',
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: { [key: string]: any };
    required: string[];
  };
}

export interface MCPToolCall {
  toolName: string;
  input: { [key: string]: any };
}

export interface MCPToolResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
  executedAt: Date;
  duration_ms: number;
}

export interface MCPCapabilities {
  supportedTools: MCPTool[];
  authRequired: boolean;
  rateLimitPerMinute?: number;
  supportsStreaming?: boolean;
}

export interface IMCPProvider {
  /**
   * Provider type identifier
   */
  readonly providerType: MCPProviderType;

  /**
   * Provider display name
   */
  readonly displayName: string;

  /**
   * Check if provider is connected and healthy
   * @returns Promise<boolean>
   */
  isHealthy(): Promise<boolean>;

  /**
   * Authenticate with the MCP provider
   * @param credentials Auth credentials (format depends on provider)
   * @returns Promise<boolean>
   */
  authenticate(credentials: any): Promise<boolean>;

  /**
   * List available tools from this provider
   * @returns Promise<MCPTool[]>
   */
  listTools(): Promise<MCPTool[]>;

  /**
   * Execute a tool via MCP
   * @param toolCall Tool call with name and input
   * @returns Promise<MCPToolResult>
   */
  executeTool(toolCall: MCPToolCall): Promise<MCPToolResult>;

  /**
   * Execute multiple tools (batch)
   * @param toolCalls Array of tool calls
   * @returns Promise<MCPToolResult[]>
   */
  executeBatchTools?(toolCalls: MCPToolCall[]): Promise<MCPToolResult[]>;

  /**
   * Get provider capabilities
   * @returns MCPCapabilities
   */
  getCapabilities(): MCPCapabilities;

  /**
   * Validate tool call before execution
   * @param toolCall Tool call to validate
   * @returns Promise<{valid: boolean; errors?: string[]}>
   */
  validateToolCall(
    toolCall: MCPToolCall,
  ): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Disconnect from provider
   * @returns Promise<void>
   */
  disconnect?(): Promise<void>;
}
