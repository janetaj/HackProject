/**
 * Sales Details Entity
 * Stores sales/subscription/licensing information
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('salesdetails')
@Index(['customerId'])
@Index(['status'])
@Index(['planType'])
export class SalesDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  customerName: string;

  @Column('varchar', { length: 255, nullable: true })
  customerId: string;

  @Column('varchar', { length: 255, nullable: true })
  customerEmail: string;

  @Column('varchar', { length: 50 })
  planType: string; // e.g., 'free', 'starter', 'professional', 'enterprise'

  @Column('varchar', { length: 50, default: 'active' })
  status: 'active' | 'inactive' | 'trial' | 'expired' | 'cancelled';

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amountEur: number;

  @Column('varchar', { length: 50, nullable: true })
  billingCycle: string; // 'monthly', 'yearly'

  @Column('integer', { nullable: true })
  maxUsers: number;

  @Column('integer', { nullable: true })
  maxGenerationsPerMonth: number;

  @Column('timestamp', { nullable: true })
  trialEndsAt: Date;

  @Column('timestamp', { nullable: true })
  subscriptionStartsAt: Date;

  @Column('timestamp', { nullable: true })
  subscriptionEndsAt: Date;

  @Column('json', { nullable: true })
  features: Record<string, any>; // enabled features for this plan

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
