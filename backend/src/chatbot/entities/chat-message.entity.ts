/**
 * Chat Message Entity
 * Stores individual messages within chat sessions
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_messages')
@Index(['sessionId', 'createdAt'])
@Index(['role'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column('varchar', { length: 20 })
  role: 'user' | 'assistant' | 'system';

  @Column('text')
  content: string;

  @Column('varchar', { length: 100, nullable: true })
  intent: string;

  @Column('integer', { default: 0 })
  tokensUsed: number;

  @Column('decimal', { precision: 10, scale: 6, default: 0 })
  costEur: number;

  @Column('varchar', { length: 100, nullable: true })
  modelUsed: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
