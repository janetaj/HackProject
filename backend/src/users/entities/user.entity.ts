/**
 * User Entity
 * Represents a user in the application with roles and encrypted credentials
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type UserRole = 'admin' | 'qa_lead' | 'qa_tester' | 'viewer';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['role'])
@Index(['is_active'])
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'qa_lead', 'qa_tester', 'viewer'],
    default: 'qa_tester',
  })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Encrypted Jira API token (AES-256)',
  })
  jira_api_token_encrypted: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When Jira token was last validated',
  })
  jira_token_validated_at: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'For soft delete functionality',
  })
  deleted_at: Date | null;
}
