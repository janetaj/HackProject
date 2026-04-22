/**
 * Generation Job Entity
 * Tracks AI test case generation jobs (queued via BullMQ)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('generation_jobs')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['jiraTicketId'])
export class GenerationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  jiraTicketId: string;

  @Column('varchar', { length: 50, nullable: true })
  jiraKey: string;

  @Column('varchar', { length: 50, default: 'queued' })
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @Column('integer', { default: 0 })
  progress: number; // 0-100

  @Column('varchar', { length: 100, nullable: true })
  modelUsed: string;

  @Column('varchar', { length: 50, nullable: true })
  modelVersion: string;

  @Column('integer', { default: 0 })
  testCasesGenerated: number;

  @Column('integer', { default: 0 })
  testStepsGenerated: number;

  @Column('integer', { default: 0 })
  inputTokens: number;

  @Column('integer', { default: 0 })
  outputTokens: number;

  @Column('integer', { default: 0 })
  totalTokens: number;

  @Column('decimal', { precision: 10, scale: 6, default: 0 })
  costEur: number;

  @Column('integer', { nullable: true })
  durationMs: number;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('json', { nullable: true })
  config: Record<string, any>; // generation parameters

  @Column('json', { nullable: true })
  result: Record<string, any>; // summary of results

  @Column('timestamp', { nullable: true })
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
