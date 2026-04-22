/**
 * Chatbot Controller
 * REST endpoints for AI chatbot sessions and messages
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ChatbotService } from '../services/chatbot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatMessageDto, CreateChatSessionDto } from '../dto/chat-message.dto';

@ApiTags('chatbot')
@ApiBearerAuth()
@Controller('v1/chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatbotController {
  constructor(private chatbotService: ChatbotService) {}

  /**
   * POST /api/v1/chatbot/sessions
   * Create a new chat session
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiBody({ type: CreateChatSessionDto })
  @ApiResponse({ status: 201, description: 'Chat session created' })
  async createSession(
    @Body() request: CreateChatSessionDto,
    @CurrentUser() user: any,
  ) {
    const session = await this.chatbotService.createSession(user.id, request.context, request.title);
    return { success: true, data: session, message: 'Chat session created' };
  }

  /**
   * GET /api/v1/chatbot/sessions
   * List chat sessions
   */
  @Get('sessions')
  @ApiOperation({ summary: 'List chat sessions' })
  @ApiResponse({ status: 200, description: 'Paginated list of chat sessions' })
  async getUserSessions(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: any,
  ) {
    const result = await this.chatbotService.getUserSessions(user.id, limit, offset);
    return {
      success: true,
      data: result.sessions,
      pagination: { total: result.total, limit, offset, pages: Math.ceil(result.total / limit) },
    };
  }

  /**
   * GET /api/v1/chatbot/sessions/:id
   * Get chat session details
   */
  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get chat session details' })
  @ApiResponse({ status: 200, description: 'Chat session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string) {
    const session = await this.chatbotService.getSession(id);
    return { success: true, data: session };
  }

  /**
   * DELETE /api/v1/chatbot/sessions/:id
   * Delete a chat session
   */
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiResponse({ status: 200, description: 'Chat session deleted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async clearSession(@Param('id') id: string) {
    await this.chatbotService.clearSession(id);
    return { success: true, message: 'Chat session deleted' };
  }

  /**
   * GET /api/v1/chatbot/sessions/:id/messages
   * Get messages for a chat session
   */
  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Get messages for a chat session' })
  @ApiResponse({ status: 200, description: 'List of messages in the session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const session = await this.chatbotService.getSession(id);
    return {
      success: true,
      data: {
        sessionId: id,
        context: session.context,
        messageCount: session.messageCount,
        messages: session.conversationHistory || [],
      },
    };
  }

  /**
   * POST /api/v1/chatbot/sessions/:id/messages
   * Send a message to the chatbot
   */
  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiBody({ type: ChatMessageDto })
  @ApiResponse({ status: 200, description: 'Message sent and response received' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async sendMessage(
    @Param('id') id: string,
    @Body() request: ChatMessageDto,
    @CurrentUser() user: any,
  ) {
    const response = await this.chatbotService.processMessage(id, request.message, user.id);
    return { success: true, data: response };
  }

  /**
   * GET /api/v1/chatbot/tools
   * Get available MCP tools
   */
  @Get('tools')
  @ApiOperation({ summary: 'List available AI tools' })
  @ApiResponse({ status: 200, description: 'List of available tools' })
  async getAvailableTools() {
    return {
      success: true,
      data: {
        providers: ['atlassian'],
        tools: [
          { provider: 'atlassian', name: 'search_jira', description: 'Search for Jira issues' },
          { provider: 'atlassian', name: 'get_issue', description: 'Get Jira issue details' },
        ],
      },
    };
  }

  /**
   * GET /api/v1/chatbot/overview
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get user chatbot usage overview' })
  @ApiResponse({ status: 200, description: 'User chatbot overview' })
  async getUserOverview(@CurrentUser() user: any) {
    const overview = await this.chatbotService.getUserOverview(user.id);
    return { success: true, data: overview };
  }
}
