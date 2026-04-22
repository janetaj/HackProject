/**
 * Data Refresh Entity
 * Tracks data refresh/sync operations for various data sources
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('datarefresh')
@Index(['sourceType', 'status'])
@Index(['lastRefreshedAt'])
export class DataRefresh {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  sourceType: string; // e.g., 'jira', 'test_cases', 'analytics'

  @Column('varchar', { length: 255, nullable: true })
  sourceName: string;

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column('timestamp', { nullable: true })
  lastRefreshedAt: Date;

  @Column('integer', { default: 0 })
  recordsProcessed: number;

  @Column('integer', { default: 0 })
  recordsUpdated: number;

  @Column('integer', { default: 0 })
  recordsFailed: number;

  @Column('integer', { nullable: true })
  durationMs: number;

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @Column('uuid', { nullable: true })
  triggeredBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
