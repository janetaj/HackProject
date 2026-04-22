/**
 * Parser Prompt Template for Groq LLM
 * Defines the prompt template for extracting structured fields from Jira tickets
 */

export interface TicketContent {
  jiraKey: string;
  summary: string;
  description: string;
  rawContent?: any;
}

/**
 * Generate Groq prompt for parsing ticket
 */
export function generateParsingPrompt(ticket: TicketContent): string {
  return `You are an expert QA analyst tasked with extracting and structuring requirement information from Jira tickets.

Jira Ticket Information:
========================
KEY: ${ticket.jiraKey}
SUMMARY: ${ticket.summary}
DESCRIPTION:
${ticket.description}

Task: Extract and structure the following information from the ticket above. Return valid JSON only.

Requirements:
1. story_id - Unique story identifier (e.g., STORY-123, or extract from ticket if not explicit)
2. title - Concise requirement title (5-50 words)
3. module - Business module/component this ticket belongs to (e.g., Authentication, Payment, User Profile)
4. description - Detailed description of the requirement (preserve original intent)
5. acceptance_criteria - Array of acceptance criteria as individual strings (minimum 1, maximum 5 criteria)
6. headers - Array of section headers found in the description (extracted structure markers)
7. test_focus - What aspects should be tested (e.g., "Login flow validation", "Payment processing")
8. edge_cases - Edge cases to consider (e.g., "Empty input", "Special characters", "Boundary values")
9. boundary_conditions - Boundary conditions (e.g., "Max length 255 chars", "Date range 2020-2030")

Output Format (MUST BE VALID JSON):
{
  "story_id": "string (required)",
  "title": "string (required)",
  "module": "string (required)",
  "description": "string (required)",
  "acceptance_criteria": ["criterion 1", "criterion 2", ...],
  "headers": ["header 1", "header 2", ...],
  "test_focus": "string (optional)",
  "edge_cases": "string (optional)",
  "boundary_conditions": "string (optional)"
}

Guidelines:
- Extract acceptance criteria as complete, standalone sentences
- Preserve technical accuracy from the original ticket
- If story_id is not explicit, derive from ticket key or context
- Ensure all required fields are populated
- Return only the JSON object, no additional text
- If information is missing, make reasonable inference based on ticket context

Parse the ticket and return ONLY valid JSON:`;
}

/**
 * Generate system prompt for Groq parser
 */
export function getSystemPrompt(): string {
  return `You are a QA requirements parser. Your task is to extract structured information from Jira tickets.
You respond with valid JSON only. Do not include any explanation or additional text.
Ensure all required fields are present in your response.
If required information is not explicitly stated, infer it from the context.`;
}

/**
 * Groq-specific configuration for parsing
 */
export const GROQ_PARSER_CONFIG = {
  model: 'mixtral-8x7b-32768', // Groq's fastest model for high throughput
  temperature: 0.3, // Low temperature for consistency
  maxTokens: 1024, // Sufficient for extraction task
  topP: 0.9,
  timeout: 30000, // 30 second timeout
};

/**
 * Alternative model selection based on ticket complexity
 */
export function selectGroqModel(ticketLength: number): string {
  // For longer tickets (>2000 chars), use more capable model
  if (ticketLength > 2000) {
    return 'mixtral-8x7b-32768';
  }
  // For shorter tickets, mixtral is sufficient
  return 'mixtral-8x7b-32768';
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJsonFromResponse(response: string): any {
  try {
    // Try to parse directly first
    return JSON.parse(response);
  } catch (e) {
    // Try to extract from markdown code block
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to extract from code block without language
    const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch && codeMatch[1]) {
      return JSON.parse(codeMatch[1]);
    }

    // Try to find JSON object in response
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }

    throw new Error('No valid JSON found in response');
  }
}

/**
 * Validate minimum requirements for parsed output
 */
export function validateMinimumRequirements(parsed: any): boolean {
  const requiredFields = ['story_id', 'title', 'module', 'description', 'acceptance_criteria'];
  
  for (const field of requiredFields) {
    if (!parsed[field]) {
      return false;
    }
  }

  // Ensure acceptance_criteria is non-empty array
  if (!Array.isArray(parsed.acceptance_criteria) || parsed.acceptance_criteria.length === 0) {
    return false;
  }

  return true;
}

/**
 * Generate fallback parsed requirement if parsing fails
 * Returns a valid but minimal parsed requirement
 */
export function generateFallbackParsed(
  ticketId: string,
  ticket: TicketContent,
): any {
  return {
    story_id: ticket.jiraKey,
    title: ticket.summary,
    module: 'Unclassified',
    description: ticket.description,
    acceptance_criteria: [
      'Requirement verification needed',
      'Manual review required',
    ],
    headers: [],
    test_focus: 'General functionality testing',
    edge_cases: 'To be determined after manual review',
    boundary_conditions: 'To be determined after manual review',
  };
}
