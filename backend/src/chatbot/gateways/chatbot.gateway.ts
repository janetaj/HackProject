/**
 * Chatbot WebSocket Gateway
 * Real-time chat delivery via WebSocket
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ChatbotService } from '../services/chatbot.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/chatbot',
  cors: true,
  transports: ['websocket', 'polling'],
})
export class ChatbotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatbotGateway.name);
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(
    private chatbotService: ChatbotService,
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2,
  ) {
    this.setupEventListeners();
  }

  /**
   * Handle client connection
   */
  handleConnection(client: AuthenticatedSocket): void {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        this.logger.warn('WebSocket connection attempt without token');
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      client.userId = decoded.sub;

      // Track connection
      if (!this.userConnections.has(client.userId)) {
        this.userConnections.set(client.userId, new Set());
      }
      this.userConnections.get(client.userId).add(client.id);

      // Join user-specific room
      client.join(`chat:${client.userId}`);

      this.logger.log(`Chat client ${client.id} connected for user ${client.userId}`);

      client.emit('connected', {
        message: 'Connected to chatbot',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: AuthenticatedSocket): void {
    if (client.userId) {
      const userSockets = this.userConnections.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }

      this.logger.log(`Chat client ${client.id} disconnected for user ${client.userId}`);
    }
  }

  /**
   * Handle incoming chat message
   */
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; message: string },
  ): Promise<void> {
    try {
      // Process message
      const response = await this.chatbotService.processMessage(
        data.sessionId,
        data.message,
        client.userId,
      );

      // Send response back to client
      client.emit('message_response', {
        sessionId: data.sessionId,
        response,
        timestamp: new Date(),
      });

      // Broadcast to all user's connections
      this.server.to(`chat:${client.userId}`).emit('message_received', {
        sessionId: data.sessionId,
        response,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Message processing failed:', error);
      client.emit('error', {
        message: 'Failed to process message',
        error: error.message,
      });
    }
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; isTyping: boolean },
  ): void {
    this.server.to(`chat:${client.userId}`).emit('user_typing', {
      sessionId: data.sessionId,
      isTyping: data.isTyping,
      userId: client.userId,
    });
  }

  /**
   * Ping for heartbeat
   */
  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  /**
   * Setup event listeners for internal communication
   */
  private setupEventListeners(): void {
    // Listen for message received from service
    this.eventEmitter.on('ws.chat.message_received', (data: any) => {
      this.broadcastMessage(data.userId, 'message_received', {
        sessionId: data.sessionId,
        response: data.response,
        timestamp: new Date(),
      });
    });

    // Listen for action events
    this.eventEmitter.on('chatbot.action_requested', (data: any) => {
      this.broadcastMessage(data.userId, 'action_requested', {
        action: data.action,
        entities: data.entities,
        timestamp: new Date(),
      });
    });

    this.logger.log('Chat event listeners setup complete');
  }

  /**
   * Broadcast message to user's connected clients
   */
  private broadcastMessage(userId: string, event: string, payload: any): void {
    this.server.to(`chat:${userId}`).emit(event, payload);
  }

  /**
   * Send message to specific user
   */
  public sendMessageToUser(
    userId: string,
    sessionId: string,
    message: any,
  ): void {
    this.broadcastMessage(userId, 'message', {
      sessionId,
      message,
      timestamp: new Date(),
    });
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    return this.userConnections.size;
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    const userSockets = this.userConnections.get(userId);
    return userSockets !== undefined && userSockets.size > 0;
  }
}
