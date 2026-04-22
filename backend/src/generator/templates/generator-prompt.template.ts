/**
 * Generator Prompt Template
 * Defines the prompt for OpenAI to generate test cases
 */

export interface ParsedRequirementForGeneration {
  story_id: string;
  title: string;
  module: string;
  description: string;
  acceptance_criteria: string[];
  headers?: string[];
  test_focus?: string;
  edge_cases?: string;
  boundary_conditions?: string;
}

/**
 * Generate OpenAI prompt for test case generation
 */
export function generateTestCasePrompt(
  requirement: ParsedRequirementForGeneration,
  testTypes: string[] = ['positive', 'negative', 'boundary', 'edge_case'],
): string {
  return `You are an expert QA engineer tasked with generating comprehensive test cases from software requirements.

Requirement Information:
========================
Story ID: ${requirement.story_id}
Title: ${requirement.title}
Module: ${requirement.module}
Description: ${requirement.description}

Acceptance Criteria:
${requirement.acceptance_criteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

${requirement.test_focus ? `\nTest Focus: ${requirement.test_focus}` : ''}
${requirement.edge_cases ? `\nEdge Cases to Consider: ${requirement.edge_cases}` : ''}
${requirement.boundary_conditions ? `\nBoundary Conditions: ${requirement.boundary_conditions}` : ''}

Task: Generate test cases for the specified test types. For each test case, create:
1. A clear, descriptive title
2. Detailed description of what is being tested
3. List of ordered test steps with:
   - Action: What to execute
   - Expected Result: What should happen
   - Data (optional): Test data needed
   - Precondition (optional): Step-level setup
4. Preconditions: Overall setup required
5. Postconditions: Cleanup required

Test Case Types to Generate: ${testTypes.join(', ')}

Test Types Definition:
- POSITIVE: Verify correct behavior with valid inputs following happy path
- NEGATIVE: Verify proper error handling with invalid/unexpected inputs
- BOUNDARY: Verify behavior at min/max values and field boundaries
- EDGE_CASE: Verify unusual or unexpected scenarios

Output Format (MUST BE VALID JSON ARRAY):
[
  {
    "title": "string (concise, indicates test type and what's tested)",
    "description": "string (detailed description of test purpose)",
    "type": "positive|negative|boundary|edge_case",
    "steps": [
      {
        "step_number": 1,
        "action": "string (what to do)",
        "expected_result": "string (what should happen)",
        "data": "string (optional test data)",
        "precondition": "string (optional step-level setup)"
      }
    ],
    "preconditions": "string (overall setup required)",
    "postconditions": "string (cleanup after test)"
  }
]

Guidelines:
- Generate between 2-5 test cases per type (2 for positive, 2-3 for others)
- Each test case should be independent and self-contained
- Steps should be clear, actionable, and verifiable
- Include realistic test data
- Consider all acceptance criteria
- Think about error scenarios and boundary values
- Ensure comprehensive coverage

Generate ONLY the JSON array with no additional text:`;
}

/**
 * Get system prompt for test case generation
 */
export function getGenerationSystemPrompt(): string {
  return `You are a QA test engineer expert at creating comprehensive, clear, and actionable test cases.
Your output must be valid JSON arrays containing test case objects.
Focus on clarity, completeness, and coverage of both happy path and edge cases.
Always validate input and provide only the requested JSON format, no explanations.`;
}

/**
 * OpenAI-specific configuration for generation
 */
export const OPENAI_GENERATION_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.5, // Balanced: creative but consistent
  maxTokens: 4096, // Sufficient for 4-8 test cases with steps
  topP: 0.9,
  timeout: 120000, // 2 minute timeout for complex generation
};

/**
 * Model selection based on requirement complexity
 */
export function selectGenerationModel(
  requirementLength: number,
  testCaseCount: number,
): string {
  // For simple requirements (< 1000 chars) and few test cases (< 5), use GPT-3.5
  if (requirementLength < 1000 && testCaseCount < 5) {
    return 'gpt-3.5-turbo';
  }

  // Default to GPT-4o for better quality
  return 'gpt-4o';
}

/**
 * Fallback test case when generation fails
 */
export function generateFallbackTestCases(
  requirement: ParsedRequirementForGeneration,
  testTypes: string[],
): Array<{
  title: string;
  description: string;
  type: string;
  steps: Array<{
    step_number: number;
    action: string;
    expected_result: string;
  }>;
  preconditions: string;
  postconditions: string;
}> {
  return testTypes.map((type) => ({
    title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${requirement.title}`,
    description: `${type} test case for requirement: ${requirement.title}. Manual review required.`,
    type,
    steps: [
      {
        step_number: 1,
        action: 'Set up test environment according to preconditions',
        expected_result: 'Environment is ready',
      },
      {
        step_number: 2,
        action: `Execute ${type} test scenario`,
        expected_result: `${type} behavior verified as expected`,
      },
      {
        step_number: 3,
        action: 'Clean up test environment',
        expected_result: 'Test data and environment cleaned',
      },
    ],
    preconditions: 'System is ready for testing. Test environment is configured.',
    postconditions:
      'Clean up any test data created. Restore system to initial state.',
  }));
}

/**
 * Count estimated tokens for a requirement (for budget estimation)
 */
export function estimateGenerationTokens(requirement: ParsedRequirementForGeneration): number {
  const contentLength =
    requirement.title.length +
    requirement.description.length +
    requirement.acceptance_criteria.join('').length +
    (requirement.test_focus?.length || 0) +
    (requirement.edge_cases?.length || 0) +
    (requirement.boundary_conditions?.length || 0);

  // Rough estimate: 1 token ≈ 4 chars, output ~2x input
  return Math.ceil((contentLength * 2) / 4);
}
