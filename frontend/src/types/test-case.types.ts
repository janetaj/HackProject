export interface TestCase {
  id: string;
  ticket_key: string;
  title: string;
  description: string;
  preconditions: string | null;
  steps: Array<{ step_number: number; action: string; expected_result: string }>;
  expected_result: string;
  priority: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TestCaseFilters {
  page?: number;
  pageSize?: number;
  ticketKey?: string;
  status?: string;
}
