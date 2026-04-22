export interface JiraTicket {
  id: string;
  jiraKey: string;
  jiraId: string;
  summary: string;
  description: string | null;
  storyId: string | null;
  module: string | null;
  acceptanceCriteria: string[];
  headers: string[];
  status: string;
  jiraStatus: string;
  project: string;
  fetchedAt: string;
  parsedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilters {
  page?: number;
  pageSize?: number;
  projectKey?: string;
  status?: string;
  search?: string;
}
