/**
 * Chatbot Module
 * Hybrid Q&A and MCP-powered co-pilot with intent detection
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotGateway } from './gateways/chatbot.gateway';
import { ChatbotRepository } from './repositories/chatbot.repository';
import { IntentDetectorService } from './services/intent-detector.service';
import { ChatSession } from './entities/chat-session.entity';

// MCP Adapters
import { AtlassianMCPAdapter } from './mcp/atlassian-mcp.adapter';
import { MCPRegistryService } from './mcp/mcp-registry.service';

// Import dependencies
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    // Database
    TypeOrmModule.forFeature([ChatSession]),

    // Event Emitter for internal communication
    EventEmitterModule.forRoot(),

    // Common utilities
    CommonModule,

    // JWT for gateway authentication
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],

  controllers: [ChatbotController],

  providers: [
    ChatbotService,
    ChatbotGateway,
    ChatbotRepository,
    IntentDetectorService,
    // MCP providers
    AtlassianMCPAdapter,
    MCPRegistryService,
    JwtService,
  ],

  exports: [ChatbotService, ChatbotRepository, MCPRegistryService],
})
export class ChatbotModule {}
