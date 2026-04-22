import { apiClient } from './api.client';

export interface DashboardStats {
  total_test_cases: number;
  test_cases_generated_today: number;
  tokens_used_today: number;
  success_rate: number;
}

export interface ActivityItem {
  id: string;
  type: 'generation' | 'review' | 'system';
  description: string;
  timestamp: string;
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    // For now, this points to a stub backend or a real one if implemented
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  },

  getActivity: async (): Promise<ActivityItem[]> => {
    const response = await apiClient.get('/dashboard/activity');
    return response.data;
  },

  getTokenUsage: async (): Promise<any[]> => {
    // Mocking or hooking up to an endpoint for chart data
    const response = await apiClient.get('/dashboard/token-usage');
    return response.data;
  }
};
