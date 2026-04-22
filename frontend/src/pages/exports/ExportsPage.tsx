import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useExports, useCreateExport } from '@/queries/useExports';
import { ExportHistory } from '@/types/export.types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Download, FileDown, Clock, Search, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { exportService } from '@/services/export.service';
import { toast } from 'sonner';

const formatFileSize = (bytes: number | null | undefined) => {
  if (bytes === undefined || bytes === null || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return '0 Bytes';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DownloadButton = ({ exportId, status }: { exportId: string; status: string }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const isCompleted = status === 'completed';

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await exportService.downloadExport(exportId);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      disabled={!isCompleted || isDownloading}
      onClick={handleDownload}
    >
      <Download className="h-4 w-4 mr-2" />
      {isDownloading ? 'Downloading...' : 'Download'}
    </Button>
  );
};

export const exportColumns: ColumnDef<ExportHistory>[] = [
  {
    accessorKey: 'fileName',
    header: 'File Name',
    cell: ({ row }) => <span className="font-medium">{row.getValue('fileName')}</span>,
  },
  {
    accessorKey: 'format',
    header: 'Format',
    cell: ({ row }) => <span className="uppercase text-xs font-bold">{row.getValue('format')}</span>,
  },
  {
    accessorKey: 'recordCount',
    header: 'Records',
  },
  {
    accessorKey: 'fileSize',
    header: 'Size',
    cell: ({ row }) => formatFileSize(row.getValue('fileSize')),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleString(),
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <DownloadButton exportId={row.original.id} status={row.original.status} />,
  }
];

export function ExportsPage() {
  const [limit] = useState(50);
  const [offset] = useState(0);
  
  const { data, isLoading, isError, error } = useExports(limit, offset);
  const { mutate: createExport, isPending: isCreating } = useCreateExport();

  const handleNewExport = (format: 'csv' | 'excel' | 'json') => {
    createExport({ format }, {
      onSuccess: () => toast.success(`Export job (${format.toUpperCase()}) triggered successfully`),
      onError: () => toast.error('Failed to trigger export'),
    });
  };

  const actionButtons = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleNewExport('csv')} disabled={isCreating}>
        <FileDown className="h-4 w-4 mr-2" />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleNewExport('excel')} disabled={isCreating}>
        <FileDown className="h-4 w-4 mr-2" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleNewExport('json')} disabled={isCreating}>
        <FileDown className="h-4 w-4 mr-2" />
        JSON
      </Button>
    </div>
  );

  return (
    <PageContainer 
      title="Export History" 
      description="Manage and download your generated test scenario exports."
      actions={actionButtons}
    >
      {isLoading ? (
        <LoadingSpinner label="Loading exports..." />
      ) : isError ? (
        <div className="p-4 text-center text-destructive">Error loading exports: {(error as Error).message}</div>
      ) : !data?.data?.length ? (
        <EmptyState 
          icon={FileDown} 
          title="No Exports Found" 
          description="You haven't generated any exports yet. Select a format above to generate your first export."
        />
      ) : (
        <DataTable columns={exportColumns} data={data.data} />
      )}
    </PageContainer>
  );
}
