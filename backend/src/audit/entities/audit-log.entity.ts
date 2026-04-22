/**
 * Audit Log Entity
 * TypeORM entity for immutable audit logging
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['entity', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 50 })
  action:
    | 'login'
    | 'logout'
    | 'generate'
    | 'approve_test_case'
    | 'reject_test_case'
    | 'regenerate'
    | 'export'
    | 'delete'
    | 'update'
    | 'create'
    | 'config_change'
    | 'user_create'
    | 'user_update'
    | 'user_delete'
    | 'jira_sync'
    | 'cancel_job';

  @Column('varchar', { length: 50 })
  entity:
    | 'user'
    | 'test_case'
    | 'test_step'
    | 'generation_job'
    | 'export_history'
    | 'jira_ticket'
    | 'notification'
    | 'chat_session'
    | 'config';

  @Column('varchar', { length: 100 })
  entityId: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  /**
   * Before snapshot of entity state (JSON)
   * Immutable - recorded at action time
   */
  @Column('json', { nullable: true })
  beforeSnapshot: Record<string, any>;

  /**
   * After snapshot of entity state (JSON)
   * Immutable - recorded at action time
   */
  @Column('json', { nullable: true })
  afterSnapshot: Record<string, any>;

  /**
   * Additional metadata (context, relationships, etc.)
   */
  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @Column('varchar', { length: 20, default: 'success' })
  status: 'success' | 'failure';

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Cannot be updated or deleted - immutable audit trail
   */
}
