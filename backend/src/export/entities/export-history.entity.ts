/**
 * Export History Entity
 * TypeORM entity for tracking export operations
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('export_histories')
@Index(['userId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['format', 'createdAt'])
export class ExportHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 20 })
  format: 'csv' | 'json' | 'excel';

  @Column('varchar', { length: 100, nullable: true })
  fileName: string;

  @Column('text')
  filePath: string;

  @Column('bigint')
  fileSize: number; // bytes

  @Column('integer')
  recordCount: number; // Number of test cases exported

  @Column('integer')
  duration: number; // Export duration in milliseconds

  @Column('json')
  filters: {
    projects?: string[];
    statuses?: string[];
    types?: string[];
    module?: string;
    startDate?: string;
    endDate?: string;
    jiraKey?: string;
  };

  @Column('varchar', { length: 50, default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @Column('text', { nullable: true })
  errorMessage: string;

  @Column('text', { nullable: true })
  downloadUrl: string; // Signed URL or relative path

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  expiresAt: Date; // For auto-deletion after 30 days

  @Column('timestamp', { nullable: true })
  downloadedAt: Date;

  @Column('integer', { default: 0 })
  downloadCount: number;
}
