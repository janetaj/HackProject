/**
 * Notifications WebSocket Gateway
 * Real-time WebSocket delivery of notifications
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

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: true,
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(
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
      // Extract token from handshake
      const token = client.handshake.auth.token;

      if (!token) {
        this.logger.warn('Connection attempt without token');
        client.disconnect();
        return;
      }

      // Verify JWT
      const decoded = this.jwtService.verify(token);
      client.userId = decoded.sub;

      // Track connection
      if (!this.userConnections.has(client.userId)) {
        this.userConnections.set(client.userId, new Set());
      }
      this.userConnections.get(client.userId).add(client.id);

      // Join user-specific room
      client.join(`user:${client.userId}`);

      this.logger.log(
        `Client ${client.id} connected for user ${client.userId}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to notifications',
        userId: client.userId,
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
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

      this.logger.log(`Client ${client.id} disconnected for user ${client.userId}`);
    }
  }

  /**
   * Ping from client (heartbeat)
   */
  @SubscribeMessage('ping')
  handlePing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ): void {
    client.emit('pong', { timestamp: Date.now() });
  }

  /**
   * Mark notification as read
   */
  @SubscribeMessage('read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ): Promise<void> {
    // Service would handle this - gateway just broadcasts
    this.server
      .to(`user:${client.userId}`)
      .emit('notification_read', { notificationId: data.notificationId });
  }

  /**
   * Get unread count (client request)
   */
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ): Promise<void> {
    // Service would handle this
    client.emit('unread-count', { count: 0 });
  }

  /**
   * Setup event listeners for internal communication
   */
  private setupEventListeners(): void {
    // Listen for notification creation from other modules
    this.eventEmitter.on('ws.notification.created', (data: any) => {
      this.broadcastNotification(data.userId, 'notification', {
        type: 'notification_created',
        notification: data.notification,
        timestamp: new Date(),
      });
    });

    // Listen for notification read
    this.eventEmitter.on('notification.read', (data: any) => {
      this.broadcastNotification(data.userId, 'notification', {
        type: 'notification_read',
        notificationId: data.notificationId,
        timestamp: new Date(),
      });
    });

    // Listen for unread count changes
    this.eventEmitter.on('notification.created', (data: any) => {
      this.broadcastNotification(data.userId, 'unread_count_changed', {
        type: 'unread_count_changed',
        timestamp: new Date(),
      });
    });

    // Listen for all read
    this.eventEmitter.on('notifications.all-read', (data: any) => {
      this.broadcastNotification(data.userId, 'notifications', {
        type: 'all_read',
        timestamp: new Date(),
      });
    });

    // Listen for all dismissed
    this.eventEmitter.on('notifications.all-dismissed', (data: any) => {
      this.broadcastNotification(data.userId, 'notifications', {
        type: 'all_dismissed',
        timestamp: new Date(),
      });
    });

    this.logger.log('Event listeners setup complete');
  }

  /**
   * Broadcast notification to user's connected clients
   */
  private broadcastNotification(
    userId: string,
    event: string,
    payload: any,
  ): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /**
   * Send notification to specific user
   * Called from service or event handlers
   */
  public sendNotificationToUser(userId: string, notification: any): void {
    this.broadcastNotification(userId, 'notification', {
      type: 'notification_created',
      notification,
      timestamp: new Date(),
    });
  }

  /**
   * Send notification to all connected clients (admin broadcast)
   */
  public broadcastToAll(notification: any): void {
    this.server.emit('notification', {
      type: 'notification_created',
      notification,
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

  /**
   * Get user connection count
   */
  public getUserConnectionCount(userId: string): number {
    const userSockets = this.userConnections.get(userId);
    return userSockets ? userSockets.size : 0;
  }
}
