/**
 * Chatbot Service
 * Core logic for conversation processing and LLM integration
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatbotRepository } from '../repositories/chatbot.repository';
import { IntentDetectorService } from './intent-detector.service';
import { MCPRegistryService } from '../mcp/mcp-registry.service';
import { ChatResponseDto, Intent } from '../dto/chat-message.dto';
import { ChatSession } from '../entities/chat-session.entity';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private repository: ChatbotRepository,
    private intentDetector: IntentDetectorService,
    private mcpRegistry: MCPRegistryService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create new chat session
   */
  async createSession(
    userId: string,
    context?: string,
    title?: string,
  ): Promise<ChatSession> {
    return this.repository.createSession(userId, context, title);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    const session = await this.repository.getSessionById(sessionId);
    if (!session) {
      throw new BadRequestException('Chat session not found');
    }
    return session;
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    return this.repository.getUserSessions(userId, limit, offset);
  }

  /**
   * Process incoming message
   */
  async processMessage(
    sessionId: string,
    message: string,
    userId: string,
  ): Promise<ChatResponseDto> {
    try {
      // Validate session
      const session = await this.getSession(sessionId);

      if (session.userId !== userId) {
        throw new BadRequestException('Unauthorized access to session');
      }

      // Add user message to history
      await this.repository.addMessage(sessionId, 'user', message);

      // Detect intent
      const intent = this.intentDetector.detectIntent(
        message,
        session.context,
      );
      this.logger.log(`Intent detected: ${intent} for message: ${message}`);

      // Extract entities
      const entities = this.intentDetector.extractEntities(
        message,
        session.context,
      );

      // Process based on intent
      let response: ChatResponseDto;

      switch (intent) {
        case Intent.QUERY:
          response = await this.handleQueryIntent(
            sessionId,
            message,
            entities,
            userId,
          );
          break;

        case Intent.ACTION:
          response = await this.handleActionIntent(
            sessionId,
            message,
            entities,
            userId,
          );
          break;

        case Intent.JIRA_QUERY:
          response = await this.handleJiraQueryIntent(
            sessionId,
            message,
            entities,
            userId,
          );
          break;

        case Intent.HELP:
          response = await this.handleHelpIntent(sessionId, message);
          break;

        default:
          response = await this.handleUnknownIntent(sessionId, message);
      }

      // Add assistant response to history
      await this.repository.addMessage(
        sessionId,
        'assistant',
        response.message,
        intent,
        response.tokensUsed,
      );

      // Update cost
      if (response.costEur) {
        await this.repository.updateCost(sessionId, response.costEur);
      }

      // Emit WebSocket event
      this.eventEmitter.emit('ws.chat.message_received', {
        userId,
        sessionId,
        response,
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to process message: ${message}`, error);

      return {
        sessionId,
        messageId: `msg-${Date.now()}`,
        intent: Intent.UNKNOWN,
        message: `Sorry, I encountered an error: ${error.message}`,
        suggestions: ['Try rephrasing your question', 'Ask for help'],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle QUERY intent
   */
  private async handleQueryIntent(
    sessionId: string,
    message: string,
    entities: Record<string, string>,
    userId: string,
  ): Promise<ChatResponseDto> {
    // TODO: Implement database queries for test cases, tickets, etc.
    const response: ChatResponseDto = {
      sessionId,
      messageId: `msg-${Date.now()}`,
      intent: Intent.QUERY,
      message: `I found 5 test cases for ${entities.ticketKey || 'your query'}. Would you like to see them?`,
      data: {
        testCases: [],
        count: 5,
      },
      actions: [
        {
          type: 'view_tickets',
          label: 'View Test Cases',
          url: `/api/v1/generator/test-cases/${entities.ticketKey}`,
        },
      ],
      suggestions: [
        'Show me approved only',
        'Export as CSV',
        'Generate more test cases',
      ],
      timestamp: new Date(),
    };

    return response;
  }

  /**
   * Handle ACTION intent
   */
  private async handleActionIntent(
    sessionId: string,
    message: string,
    entities: Record<string, string>,
    userId: string,
  ): Promise<ChatResponseDto> {
    const action = this.intentDetector.extractAction(message);

    const response: ChatResponseDto = {
      sessionId,
      messageId: `msg-${Date.now()}`,
      intent: Intent.ACTION,
      message: `I'll help you ${action} ${entities.ticketKey || 'test cases'}.`,
      actions: [
        {
          type: action,
          label: `Confirm ${action}`,
          data: entities,
        },
      ],
      suggestions: [
        'Yes, proceed',
        'Cancel',
        'Modify options',
      ],
      timestamp: new Date(),
    };

    // Emit action event for downstream handling
    this.eventEmitter.emit('chatbot.action_requested', {
      userId,
      sessionId,
      action,
      entities,
    });

    return response;
  }

  /**
   * Handle JIRA_QUERY intent
   */
  private async handleJiraQueryIntent(
    sessionId: string,
    message: string,
    entities: Record<string, string>,
    userId: string,
  ): Promise<ChatResponseDto> {
    try {
      // Try to execute MCP tool for Jira
      if (entities.ticketKey) {
        const result = await this.mcpRegistry.executeTool('get_issue', {
          issueKey: entities.ticketKey,
        });

        if (result.success) {
          const response: ChatResponseDto = {
            sessionId,
            messageId: `msg-${Date.now()}`,
            intent: Intent.JIRA_QUERY,
            message: `Found Jira issue ${entities.ticketKey}: ${result.data.summary}`,
            data: result.data,
            actions: [
              {
                type: 'generate',
                label: 'Generate test cases',
                data: { ticketKey: entities.ticketKey },
              },
            ],
            suggestions: [
                'Generate test cases',
              'Show related issues',
              'View epic',
            ],
            timestamp: new Date(),
          };

          return response;
        }
      }

      // Fallback to cached data
      return {
        sessionId,
        messageId: `msg-${Date.now()}`,
        intent: Intent.JIRA_QUERY,
        message: 'I can search Jira for you. Please provide an issue key like PROJ-123.',
        suggestions: [
          'Show me PROJ-123',
          'Search for open issues',
          'List all projects',
        ],
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Jira query failed:', error);

      return {
        sessionId,
        messageId: `msg-${Date.now()}`,
        intent: Intent.JIRA_QUERY,
        message: 'I couldn\'t reach Jira right now, but I can use cached data.',
        suggestions: [
          'Try again',
          'Search locally',
          'Ask something else',
        ],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle HELP intent
   */
  private async handleHelpIntent(
    sessionId: string,
    message: string,
  ): Promise<ChatResponseDto> {
    return {
      sessionId,
      messageId: `msg-${Date.now()}`,
      intent: Intent.HELP,
      message: `I can help you with test case generation and management. Here's what I can do:
        • Generate test cases from Jira tickets
        • Search and list test cases
        • Approve or reject test cases
        • Export test cases in CSV/JSON/Excel
        • Query Jira issues
        • Track generation status`,
      suggestions: [
        'Generate test cases',
        'Show recent tickets',
        'Export test cases',
        'What\'s my budget?',
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Handle UNKNOWN intent
   */
  private async handleUnknownIntent(
    sessionId: string,
    message: string,
  ): Promise<ChatResponseDto> {
    const suggestions = [
      'Generate test cases for PROJ-123',
      'Show me pending approvals',
      'Export as CSV',
      'Get help',
    ];

    return {
      sessionId,
      messageId: `msg-${Date.now()}`,
      intent: Intent.UNKNOWN,
      message: 'I didn\'t quite understand that. Could you rephrase or try one of the suggestions below?',
      suggestions,
      timestamp: new Date(),
    };
  }

  /**
   * Clear session (archive)
   */
  async clearSession(sessionId: string): Promise<void> {
    await this.repository.archiveSession(sessionId);
  }

  /**
   * Get session statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<any> {
    return this.repository.getStatistics(startDate, endDate);
  }

  /**
   * Get user overview
   */
  async getUserOverview(userId: string): Promise<any> {
    return this.repository.getUserOverview(userId);
  }
}
