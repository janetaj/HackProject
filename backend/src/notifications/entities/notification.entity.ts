/**
 * Notification Entity
 * TypeORM entity for storing notifications
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['userId', 'readAt'])
@Index(['type', 'createdAt'])
@Index(['priority', 'readAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 50 })
  type:
    | 'ticket_detected'
    | 'generation_complete'
    | 'generation_failed'
    | 'approval_needed'
    | 'budget_alert'
    | 'export_ready'
    | 'ticket_updated'
    | 'system_alert';

  @Column('varchar', { length: 200 })
  title: string;

  @Column('text')
  message: string;

  @Column('varchar', { length: 20, default: 'medium' })
  priority: 'low' | 'medium' | 'high' | 'critical';

  @Column('json', { nullable: true })
  metadata: {
    ticketId?: string;
    jiraKey?: string;
    jobId?: string;
    exportId?: string;
    testCaseId?: string;
    projectKey?: string;
    cost?: number;
    action?: string;
    actionUrl?: string;
  };

  @Column('timestamp', { nullable: true })
  readAt: Date;

  @Column('boolean', { default: false })
  dismissed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Computed property: is unread
   */
  isUnread(): boolean {
    return !this.readAt && !this.dismissed;
  }
}
