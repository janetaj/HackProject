export interface GenerationJob {
  id: string;
  ticket_key: string;
  project_key: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  stage: string | null;
  error_message: string | null;
  generated_count: number;
  created_at: string;
  completed_at: string | null;
}
