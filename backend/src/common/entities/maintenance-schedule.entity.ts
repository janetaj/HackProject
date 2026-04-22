/**
 * Maintenance Schedule Entity
 * Tracks planned and ongoing maintenance windows
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('maintenance_schedule')
@Index(['status'])
@Index(['scheduledStart'])
export class MaintenanceSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 50, default: 'scheduled' })
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  @Column('varchar', { length: 50, nullable: true })
  maintenanceType: string; // e.g., 'database', 'deployment', 'security_patch'

  @Column('timestamp')
  scheduledStart: Date;

  @Column('timestamp')
  scheduledEnd: Date;

  @Column('timestamp', { nullable: true })
  actualStart: Date;

  @Column('timestamp', { nullable: true })
  actualEnd: Date;

  @Column('text', { nullable: true })
  affectedServices: string;

  @Column('boolean', { default: false })
  notifyUsers: boolean;

  @Column('text', { nullable: true })
  notificationMessage: string;

  @Column('uuid', { nullable: true })
  createdBy: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
