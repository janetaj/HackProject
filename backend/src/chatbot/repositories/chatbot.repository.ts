/**
 * Chatbot Repository
 * Custom queries for chat sessions
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';

@Injectable()
export class ChatbotRepository {
  constructor(
    @InjectRepository(ChatSession)
    private repository: Repository<ChatSession>,
  ) {}

  /**
   * Create new chat session
   */
  async createSession(
    userId: string,
    context?: string,
    title?: string,
  ): Promise<ChatSession> {
    const session = this.repository.create({
      userId,
      context,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      conversationHistory: [],
      messageCount: 0,
      totalTokensUsed: 0,
      totalCostEur: 0,
      status: 'active',
      metadata: {},
    });

    return this.repository.save(session);
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<ChatSession> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Get user's sessions
   */
  async getUserSessions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    const [sessions, total] = await this.repository.findAndCount({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { sessions, total };
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<ChatSession[]> {
    return this.repository.find({
      where: { userId, status: 'active' },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    message: string,
    intent?: string,
    tokensUsed?: number,
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const newMessage = {
      role,
      message,
      intent,
      timestamp: new Date(),
      tokensUsed,
    };

    if (!session.conversationHistory) {
      session.conversationHistory = [];
    }

    session.conversationHistory.push(newMessage);
    session.messageCount += 1;

    if (tokensUsed) {
      session.totalTokensUsed += tokensUsed;
    }

    await this.repository.save(session);
  }

  /**
   * Update session metadata
   */
  async updateMetadata(sessionId: string, metadata: any): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.metadata = { ...session.metadata, ...metadata };
    await this.repository.save(session);
  }

  /**
   * Update session cost
   */
  async updateCost(sessionId: string, costEur: number): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.totalCostEur += costEur;
    await this.repository.save(session);
  }

  /**
   * Archive session
   */
  async archiveSession(sessionId: string): Promise<void> {
    await this.repository.update(
      { id: sessionId },
      { status: 'archived', archivedAt: new Date() },
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.repository.update({ id: sessionId }, { status: 'deleted' });
  }

  /**
   * Get session statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    totalTokensUsed: number;
    totalCostEur: number;
  }> {
    const query = this.repository.createQueryBuilder('cs');

    if (startDate && endDate) {
      query.where('cs.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const [sessions, sessionCount] = await query.getManyAndCount();

    const totalSessions = sessionCount;
    const activeSessions = sessions.filter(
      (s) => s.status === 'active',
    ).length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalTokensUsed = sessions.reduce(
      (sum, s) => sum + s.totalTokensUsed,
      0,
    );
    const totalCostEur = sessions.reduce((sum, s) => sum + s.totalCostEur, 0);

    return {
      totalSessions,
      activeSessions,
      totalMessages,
      totalTokensUsed,
      totalCostEur,
    };
  }

  /**
   * Search sessions by title or content
   */
  async searchSessions(
    userId: string,
    query: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ sessions: ChatSession[]; total: number }> {
    // Simple LIKE search - in production use full-text search
    const [sessions, total] = await this.repository.findAndCount({
      where: [
        { userId, title: `%${query}%` },
        { userId, context: `%${query}%` },
      ],
      order: { updatedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { sessions, total };
  }

  /**
   * Get sessions by context (ticket, project, etc.)
   */
  async getSessionsByContext(
    userId: string,
    context: string,
  ): Promise<ChatSession[]> {
    return this.repository.find({
      where: { userId, context },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Cleanup old archived sessions
   */
  async cleanupArchivedSessions(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.repository.delete({
      status: 'archived',
      archivedAt: cutoffDate,
    });

    return result.affected || 0;
  }

  /**
   * Get user session history overview
   */
  async getUserOverview(userId: string): Promise<any> {
    const sessions = await this.repository.find({
      where: { userId },
    });

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter((s) => s.status === 'active').length,
      archivedSessions: sessions.filter((s) => s.status === 'archived').length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messageCount, 0),
      totalTokensUsed: sessions.reduce((sum, s) => sum + s.totalTokensUsed, 0),
      totalCostEur: sessions.reduce((sum, s) => sum + s.totalCostEur, 0),
      recentContext: sessions[0]?.context || null,
    };
  }
}
