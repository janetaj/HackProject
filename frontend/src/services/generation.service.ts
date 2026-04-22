import { apiClient } from './api.client';
import { GenerationJob } from '../types/generation.types';
import { PaginatedResponse } from '../types/api.types';

export const generationService = {
  getQueue: async (status?: string): Promise<PaginatedResponse<GenerationJob>> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await apiClient.get(`/generation/queue?${params.toString()}`);
    return response.data;
  },

  retryJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/generation/queue/${jobId}/retry`);
  },

  queueJob: async (ticketId: string): Promise<any> => {
    const response = await apiClient.post(`/generator/generate`, { ticket_id: ticketId });
    return response.data;
  },
  cancelJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/generation/queue/${jobId}/cancel`);
  },
};
