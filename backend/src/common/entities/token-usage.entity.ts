/**
 * Token Usage Entity
 * Tracks LLM token consumption per request for budget monitoring
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('token_usage')
@Index(['userId', 'createdAt'])
@Index(['provider', 'model'])
@Index(['actionType'])
@Index(['createdAt'])
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column('varchar', { length: 100 })
  provider: string; // 'openai', 'groq', etc.

  @Column('varchar', { length: 100 })
  model: string; // 'gpt-4o', 'llama-3.1-70b', etc.

  @Column('varchar', { length: 100 })
  actionType: string; // 'generation', 'parsing', 'chatbot', 'embedding'

  @Column('integer', { default: 0 })
  inputTokens: number;

  @Column('integer', { default: 0 })
  outputTokens: number;

  @Column('integer', { default: 0 })
  totalTokens: number;

  @Column('decimal', { precision: 10, scale: 6, default: 0 })
  costEur: number;

  @Column('integer', { nullable: true })
  requestDurationMs: number;

  @Column('boolean', { default: true })
  success: boolean;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('varchar', { length: 255, nullable: true })
  entityType: string; // 'test_case', 'chat_message', etc.

  @Column('varchar', { length: 255, nullable: true })
  entityId: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
