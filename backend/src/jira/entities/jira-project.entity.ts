/**
 * Jira Project Entity
 * Stores Jira project configurations and sync metadata
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('jira_projects')
@Index(['projectKey'], { unique: true })
@Index(['isActive'])
export class JiraProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  projectKey: string;

  @Column('varchar', { length: 255 })
  projectName: string;

  @Column('varchar', { length: 100, nullable: true })
  projectId: string;

  @Column('varchar', { length: 500, nullable: true })
  baseUrl: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 100, nullable: true })
  leadName: string;

  @Column('varchar', { length: 255, nullable: true })
  leadEmail: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('boolean', { default: true })
  syncEnabled: boolean;

  @Column('varchar', { length: 500, nullable: true })
  syncJql: string; // Custom JQL for filtering tickets

  @Column('integer', { default: 120000 })
  pollIntervalMs: number;

  @Column('timestamp', { nullable: true })
  lastSyncedAt: Date;

  @Column('varchar', { length: 50, nullable: true })
  lastSyncStatus: string;

  @Column('integer', { default: 0 })
  totalTicketsSynced: number;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
