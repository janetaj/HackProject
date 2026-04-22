/**
 * Export Job Entity
 * Tracks asynchronous export job operations (queued via BullMQ)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('export_jobs')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['jobType'])
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 50 })
  jobType: string; // e.g., 'test_cases', 'audit_logs', 'jira_tickets'

  @Column('varchar', { length: 20 })
  format: 'csv' | 'json' | 'excel' | 'pdf';

  @Column('varchar', { length: 50, default: 'queued' })
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @Column('integer', { default: 0 })
  progress: number; // 0-100

  @Column('json', { nullable: true })
  filters: Record<string, any>;

  @Column('varchar', { length: 500, nullable: true })
  filePath: string;

  @Column('varchar', { length: 255, nullable: true })
  fileName: string;

  @Column('bigint', { nullable: true })
  fileSize: number;

  @Column('integer', { nullable: true })
  recordCount: number;

  @Column('integer', { nullable: true })
  durationMs: number;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('varchar', { length: 500, nullable: true })
  downloadUrl: string;

  @Column('timestamp', { nullable: true })
  expiresAt: Date;

  @Column('timestamp', { nullable: true })
  startedAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
