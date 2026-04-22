/**
 * App Navigation Menu Entity
 * Stores navigation menu items for the application UI
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('app_navigation_menu')
@Index(['parentId'])
@Index(['sortOrder'])
@Index(['isActive'])
export class AppNavigationMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 255 })
  label: string;

  @Column('varchar', { length: 500, nullable: true })
  route: string;

  @Column('varchar', { length: 100, nullable: true })
  icon: string;

  @Column('uuid', { nullable: true })
  parentId: string;

  @Column('integer', { default: 0 })
  sortOrder: number;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('varchar', { length: 50, nullable: true })
  requiredRole: string;

  @Column('varchar', { length: 50, nullable: true })
  badge: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
