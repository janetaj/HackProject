/**
 * Chat Session Entity
 * TypeORM entity for storing chat sessions and messages
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_sessions')
@Index(['userId', 'createdAt'])
@Index(['status', 'updatedAt'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 500, nullable: true })
  title: string;

  @Column('text', { nullable: true })
  context: string; // Initial context (ticket key, project, etc.)

  @Column('json', { nullable: true })
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    message: string;
    intent?: string;
    timestamp: Date;
    tokensUsed?: number;
  }>;

  @Column('integer', { default: 0 })
  messageCount: number;

  @Column('integer', { default: 0 })
  totalTokensUsed: number;

  @Column('decimal', { precision: 10, scale: 4, default: 0 })
  totalCostEur: number;

  @Column('varchar', { length: 50, default: 'active' })
  status: 'active' | 'archived' | 'deleted';

  @Column('json', { nullable: true })
  metadata: {
    lastIntentDetected?: string;
    lastActionTaken?: string;
    relatedTickets?: string[];
    relatedGenerations?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  archivedAt: Date;
}
