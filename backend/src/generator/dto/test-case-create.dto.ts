/**
 * Test Case Create DTO
 * Internal DTO for creating test cases from LLM output
 */

import { z } from 'zod';

export interface TestStepData {
  step_number: number;
  action: string;
  expected_result: string;
  data?: string;
  precondition?: string;
}

export interface TestCaseData {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'boundary' | 'edge_case';
  steps: TestStepData[];
  preconditions?: string;
  postconditions?: string;
  focus_area?: string;
}

/**
 * Zod schema for validating test case data from LLM
 */
export const TestStepSchema = z.object({
  step_number: z.number().int().positive('Step number must be positive'),
  action: z.string().min(5, 'Action must be at least 5 characters'),
  expected_result: z.string().min(5, 'Expected result must be at least 5 characters'),
  data: z.string().optional(),
  precondition: z.string().optional(),
});

export const TestCaseDataSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['positive', 'negative', 'boundary', 'edge_case']),
  steps: z.array(TestStepSchema).min(1, 'At least 1 step required').max(20, 'Max 20 steps'),
  preconditions: z.string().optional(),
  postconditions: z.string().optional(),
  focus_area: z.string().optional(),
});

export const GenerationBatchOutputSchema = z.array(TestCaseDataSchema);

export type ValidatedTestCaseData = z.infer<typeof TestCaseDataSchema>;
export type ValidatedBatchOutput = z.infer<typeof GenerationBatchOutputSchema>;

/**
 * Generate test case ID (TC-PROJ-123-001)
 */
import { v4 as uuidv4 } from 'uuid';

export function generateTestCaseId(
  projectKey: string,
  ticketNumber: number,
  sequenceNumber: number,
): string {
  return uuidv4();
}

/**
 * Generate fallback test case when LLM fails
 */
export function generateFallbackTestCase(
  ticketId: string,
  type: 'positive' | 'negative' | 'boundary' | 'edge_case',
  title: string,
): TestCaseData {
  const typeDefaults: Record<string, { title: string; description: string }> = {
    positive: {
      title: `Positive: ${title}`,
      description: 'Verify successful execution of the requirement with valid inputs',
    },
    negative: {
      title: `Negative: ${title}`,
      description: 'Verify proper error handling with invalid/unexpected inputs',
    },
    boundary: {
      title: `Boundary: ${title}`,
      description: 'Verify behavior at boundary conditions (min/max values)',
    },
    edge_case: {
      title: `Edge Case: ${title}`,
      description: 'Verify behavior under unusual/unexpected conditions',
    },
  };

  const defaults = typeDefaults[type];

  return {
    title: defaults.title,
    description: defaults.description,
    type,
    steps: [
      {
        step_number: 1,
        action: 'Set up test environment',
        expected_result: 'Environment ready for testing',
      },
      {
        step_number: 2,
        action: 'Execute test action',
        expected_result: `${type} behavior verified`,
      },
      {
        step_number: 3,
        action: 'Clean up test environment',
        expected_result: 'Environment cleaned',
      },
    ],
    preconditions: 'Test environment is ready',
    postconditions: 'Clean up test data',
  };
}
