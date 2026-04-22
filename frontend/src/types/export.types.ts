export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportFormat = 'csv' | 'excel' | 'json';

export interface ExportHistory {
  id: string;
  format: ExportFormat;
  fileName: string;
  fileSize: number;
  recordCount: number;
  status: ExportStatus;
  createdAt: string;
  expiresAt: string | null;
  downloadUrl: string | null;
  downloadCount: number;
  filters: any;
}
