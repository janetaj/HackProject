import { apiClient } from './api.client';
import { JiraTicket, TicketFilters } from '../types/jira.types';
import { PaginatedResponse } from '../types/api.types';

export const jiraService = {
  getTickets: async (filters: TicketFilters): Promise<PaginatedResponse<JiraTicket>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters.projectKey) params.append('projectKey', filters.projectKey);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await apiClient.get(`/jira/tickets?${params.toString()}`);
    return response.data;
  },

  syncTickets: async (): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/jira/sync');
    return response.data;
  },
};
