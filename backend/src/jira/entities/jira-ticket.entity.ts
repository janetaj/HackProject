/**
 * Jira Ticket Entity
 * Represents a Jira ticket fetched from Jira Cloud
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type JiraTicketStatus =
  | 'new'
  | 'updated'
  | 'parsing'
  | 'ready_for_generation'
  | 'generation_queued'
  | 'generating'
  | 'completed'
  | 'skipped';

@Entity('jira_tickets')
@Index(['jira_key'], { unique: true })
@Index(['project'])
@Index(['status'])
@Index(['updated_at'])
export class JiraTicket {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  jira_key: string;

  @Column({ type: 'varchar', length: 100 })
  jira_id: string;

  @Column({ type: 'varchar', length: 50 })
  project: string;

  @Column({ type: 'varchar', length: 500 })
  summary: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  story_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module: string | null;

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: 'Array of acceptance criteria',
  })
  acceptance_criteria: string[] | null;

  @Column({
    type: 'simple-array',
    nullable: true,
    comment: 'Array of section headers',
  })
  headers: string[] | null;

  @Column({
    type: 'enum',
    enum: [
      'new',
      'updated',
      'parsing',
      'ready_for_generation',
      'generation_queued',
      'generating',
      'completed',
      'skipped',
    ],
    default: 'new',
  })
  status: JiraTicketStatus;

  @Column({ type: 'varchar', length: 100 })
  jira_status: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Full response from Jira API',
  })
  raw_content: any;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Parsed fields by ParserService',
  })
  parsed_fields: any;

  @Column({ type: 'timestamp' })
  fetched_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  parsed_at: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
