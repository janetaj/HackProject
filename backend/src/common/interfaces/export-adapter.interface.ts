/**
 * Export Adapter Abstraction Interface
 * Defines the contract for exporting test cases in different formats
 */

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export interface ExportFilters {
  projectKey?: string;
  status?: 'pending_review' | 'approved' | 'rejected' | 'archived';
  module?: string;
  types?: ('positive' | 'negative' | 'boundary' | 'edge_case')[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface ExportResult {
  format: ExportFormat;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  recordCount: number;
  generatedAt: Date;
}

export interface IExportAdapter {
  /**
   * Export format supported by this adapter
   */
  format: ExportFormat;

  /**
   * Check if adapter is available/healthy
   * @returns Promise<boolean>
   */
  isAvailable(): Promise<boolean>;

  /**
   * Export test cases to file
   * @param testCases Array of test case data
   * @param filters Applied filters
   * @param outputPath Directory path for output
   * @returns Promise<ExportResult>
   */
  export(
    testCases: any[],
    filters: ExportFilters,
    outputPath: string,
  ): Promise<ExportResult>;

  /**
   * Validate data before export
   * @param testCases Array of test case data
   * @returns Promise<{valid: boolean; errors?: string[]}>
   */
  validate(testCases: any[]): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Get export format display name
   * @returns string
   */
  getDisplayName(): string;
}
