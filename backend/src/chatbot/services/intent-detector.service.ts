/**
 * Intent Detector Service
 * Classifies user messages to determine intent (query, action, jira_query, help, unknown)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Intent } from '../dto/chat-message.dto';

@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);

  /**
   * Detect intent from user message
   */
  detectIntent(message: string, context?: string): Intent {
    const lowerMessage = message.toLowerCase().trim();

    // Check for HELP intent
    if (this.isHelpIntent(lowerMessage)) {
      return Intent.HELP;
    }

    // Check for ACTION intent (modify/create/generate)
    if (this.isActionIntent(lowerMessage)) {
      return Intent.ACTION;
    }

    // Check for JIRA_QUERY intent (live Jira queries)
    if (this.isJiraQueryIntent(lowerMessage, context)) {
      return Intent.JIRA_QUERY;
    }

    // Check for QUERY intent (database lookup)
    if (this.isQueryIntent(lowerMessage)) {
      return Intent.QUERY;
    }

    return Intent.UNKNOWN;
  }

  /**
   * Extract action from message
   */
  extractAction(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Generation actions
    if (
      lowerMessage.includes('generate') ||
      lowerMessage.includes('create test')
    ) {
      return 'generate';
    }

    // Approval actions
    if (lowerMessage.includes('approve')) {
      return 'approve';
    }

    // Rejection actions
    if (lowerMessage.includes('reject')) {
      return 'reject';
    }

    // Export actions
    if (lowerMessage.includes('export')) {
      return 'export';
    }

    // View/search actions
    if (
      lowerMessage.includes('show') ||
      lowerMessage.includes('list') ||
      lowerMessage.includes('find')
    ) {
      return 'view';
    }

    return null;
  }

  /**
   * Extract entities from message (ticket key, project, etc.)
   */
  extractEntities(
    message: string,
    context?: string,
  ): Record<string, string> {
    const entities = {};

    // Extract Jira ticket key (e.g., PROJ-123)
    const ticketMatch = message.match(/([A-Z][A-Z0-9]*-\d+)/);
    if (ticketMatch) {
      entities['ticketKey'] = ticketMatch[1];
    }

    // Extract project key from context
    if (context) {
      const projectMatch = context.match(/^([A-Z][A-Z0-9]*)/);
      if (projectMatch) {
        entities['project'] = projectMatch[1];
      }
    }

    // Extract test case type
    const typeMatch = message.match(
      /(positive|negative|boundary|edge.?case)/i,
    );
    if (typeMatch) {
      entities['testCaseType'] = typeMatch[1].toLowerCase();
    }

    // Extract format (CSV, JSON, Excel)
    const formatMatch = message.match(/(csv|json|excel|xlsx)/i);
    if (formatMatch) {
      entities['format'] = formatMatch[1].toLowerCase();
    }

    return entities;
  }

  /**
   * Generate follow-up suggestions based on intent and message
   */
  generateSuggestions(
    intent: Intent,
    message: string,
    entities: Record<string, string>,
  ): string[] {
    const suggestions = [];

    switch (intent) {
      case Intent.QUERY:
        suggestions.push('Show me test cases for this ticket');
        suggestions.push('List all approved test cases');
        suggestions.push('What\'s the generation status?');
        break;

      case Intent.ACTION:
        suggestions.push('Generate test cases');
        suggestions.push('Approve these test cases');
        suggestions.push('Export as CSV');
        break;

      case Intent.JIRA_QUERY:
        suggestions.push('Search for related issues');
        suggestions.push('Show me the epic');
        suggestions.push('Get sprint details');
        break;

      case Intent.HELP:
        suggestions.push('Show me example queries');
        suggestions.push('What actions can I perform?');
        suggestions.push('How do I generate test cases?');
        break;

      default:
        suggestions.push('Could you clarify your request?');
        suggestions.push('Show me available commands');
    }

    return suggestions;
  }

  /**
   * Check if message is requesting help
   */
  private isHelpIntent(message: string): boolean {
    const helpKeywords = [
      'help',
      'can you',
      'how do i',
      'what can',
      'how to',
      'guide',
      'tutorial',
      'examples',
      'show me',
      'teach me',
    ];
    return helpKeywords.some((keyword) => message.includes(keyword));
  }

  /**
   * Check if message is requesting an action (generate, approve, etc.)
   */
  private isActionIntent(message: string): boolean {
    const actionKeywords = [
      'generate',
      'create',
      'approve',
      'reject',
      'export',
      'delete',
      'update',
      'regenerate',
      'bulk',
      'batch',
    ];
    return actionKeywords.some((keyword) => message.includes(keyword));
  }

  /**
   * Check if message is a Jira query
   */
  private isJiraQueryIntent(message: string, context?: string): boolean {
    const jiraKeywords = [
      'jira',
      'issue',
      'epic',
      'sprint',
      'project',
      'ticket',
      'backlog',
      'component',
      'link',
      '@jira',
    ];

    // Check for explicit Jira keywords
    if (jiraKeywords.some((keyword) => message.includes(keyword))) {
      return true;
    }

    // Check for Jira ticket key pattern and query keywords
    if (
      /[A-Z][A-Z0-9]*-\d+/.test(message) &&
      (message.includes('what') ||
        message.includes('show') ||
        message.includes('search') ||
        message.includes('find'))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if message is a database query
   */
  private isQueryIntent(message: string): boolean {
    const queryKeywords = [
      'list',
      'show',
      'get',
      'view',
      'search',
      'find',
      'count',
      'total',
      'how many',
      'status',
      'pending',
      'approved',
    ];
    return queryKeywords.some((keyword) => message.includes(keyword));
  }
}
