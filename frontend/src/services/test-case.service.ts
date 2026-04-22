import { apiClient } from './api.client';
import { TestCase, TestCaseFilters } from '../types/test-case.types';
import { PaginatedResponse } from '../types/api.types';

export const testCaseService = {
  getTestCases: async (filters: TestCaseFilters): Promise<PaginatedResponse<TestCase>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters.ticketKey) params.append('ticketKey', filters.ticketKey);
    if (filters.status) params.append('status', filters.status);

    const response = await apiClient.get(`/test-cases?${params.toString()}`);
    return response.data;
  },
  
  approveTestCase: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/test-cases/${id}/approve`, {});
    return response.data;
  },

  rejectTestCase: async (id: string, reason: string): Promise<any> => {
    const response = await apiClient.post(`/test-cases/${id}/reject`, { reason });
    return response.data;
  },

  updateTestCase: async (id: string, data: Partial<TestCase>): Promise<any> => {
    const response = await apiClient.patch(`/test-cases/${id}`, data);
    return response.data;
  }
};
