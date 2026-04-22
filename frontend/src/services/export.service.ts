import { apiClient } from './api.client';
import { ExportHistory } from '../types/export.types';
import { PaginatedResponse } from '../types/api.types';

export const exportService = {
  getExports: async (limit: number = 50, offset: number = 0): Promise<PaginatedResponse<ExportHistory>> => {
    const response = await apiClient.get(`/export?limit=${limit}&offset=${offset}`);
    // Backend returns { success: true, data: result.exports, pagination: { total, limit, offset, pages } }
    return response.data;
  },

  getExportStatus: async (id: string): Promise<ExportHistory> => {
    const response = await apiClient.get(`/export/${id}`);
    return response.data.data;
  },

  downloadExport: async (id: string) => {
    try {
      // Get the export details first to get the filename
      const statusResponse = await apiClient.get(`/export/${id}`);
      const fileName = statusResponse.data.data.fileName || `export_${id}.csv`;

      // Fetch the file as a blob
      const response = await apiClient.get(`/export/${id}/download`, {
        responseType: 'blob',
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download export file');
    }
  },

  triggerExport: async (data: any): Promise<any> => {
    const response = await apiClient.post('/export', data);
    return response.data;
  }
};
