/**
 * Test Step Entity
 * Individual step within a test case
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { TestCase } from './test-case.entity';

@Entity('test_steps')
@Index(['test_case_id'])
@Index(['step_number'])
export class TestStep {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  test_case_id: string; // Reference to parent test case

  @ManyToOne(() => TestCase, (testCase) => testCase.steps, {
    onDelete: 'CASCADE',
  })
  test_case: TestCase;

  @Column({ type: 'integer' })
  step_number: number; // Order sequence

  @Column({ type: 'text' })
  action: string; // What to do

  @Column({ type: 'text' })
  expected_result: string; // What should happen

  @Column({ type: 'text', nullable: true })
  data: string | null; // Test data (optional)

  @Column({ type: 'text', nullable: true })
  precondition: string | null; // Step-level precondition

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
